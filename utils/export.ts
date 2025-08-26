import { Exam, Question, Tag } from '../types';
import { getImage } from '../services/imageStore';

declare const jspdf: any;

const isImageKey = (url?: string): url is string => !!url && url.startsWith('idb://');

const getImageDimensions = (base64: string): Promise<{ width: number; height: number }> => {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({ width: 0, height: 0 }); // Handle error
        img.src = base64;
    });
};

export const exportExamAsJson = async (exam: Exam, questions: Question[], tags: Tag[]): Promise<void> => {
    const questionsWithImages = await Promise.all(
        JSON.parse(JSON.stringify(questions)).map(async (q: Question) => {
            if (isImageKey(q.imageUrl)) {
                q.imageUrl = await getImage(q.imageUrl);
            }
            if (q.answer?.imageUrls) {
                q.answer.imageUrls = await Promise.all(
                    q.answer.imageUrls.map((url: string) => isImageKey(url) ? getImage(url) : url)
                );
            }
            return q;
        })
    );

    const dataToExport = {
        version: '2.0.0',
        createdAt: new Date().toISOString(),
        exam,
        questions: questionsWithImages,
        tags,
    };

    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().slice(0, 10);
    link.download = `restudy-exam-${exam.name.replace(/\s+/g, '_')}-${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};


export const exportExamAsPdf = async (exam: Exam, questions: Question[]): Promise<void> => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4'
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const availableWidth = pageWidth - (margin * 2);
    let y = margin;
    
    doc.setFontSize(24).text(exam.name, pageWidth / 2, y, { align: 'center' });
    y += 30;

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        
        const checkPageBreak = (neededHeight: number) => {
            if (y + neededHeight > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }
        };
        
        doc.setLineWidth(1).line(margin, y, pageWidth - margin, y);
        y+=5;
        
        doc.setFontSize(14).setFont(undefined, 'bold');
        const questionHeaderText = `Question ${i + 1}`;
        checkPageBreak(20);
        doc.text(questionHeaderText, margin, y+=15);
        doc.setFontSize(11).setFont(undefined, 'normal');

        if (q.text) {
             const textLines = doc.splitTextToSize(q.text, availableWidth);
             checkPageBreak(textLines.length * 12);
             doc.text(textLines, margin, y+=15);
             y += textLines.length * 12;
        }

        if (q.imageUrl && isImageKey(q.imageUrl)) {
            const imageData = await getImage(q.imageUrl);
            if(imageData) {
                const { width, height } = await getImageDimensions(imageData);
                const aspectRatio = width / height;
                let imgWidth = availableWidth;
                let imgHeight = imgWidth / aspectRatio;
                
                checkPageBreak(imgHeight + 10);
                doc.addImage(imageData, 'JPEG', margin, y + 5, imgWidth, imgHeight);
                y += imgHeight + 10;
            }
        }
        
        y+=10; // spacing before answer
        
        if (q.answer) {
             doc.setFontSize(12).setFont(undefined, 'bold');
             const answerHeaderText = "Answer:";
             checkPageBreak(30);
             doc.text(answerHeaderText, margin, y+=15);
             doc.setFontSize(11).setFont(undefined, 'normal');

             if(q.answer.text) {
                const answerLines = doc.splitTextToSize(q.answer.text, availableWidth);
                checkPageBreak(answerLines.length * 12);
                doc.text(answerLines, margin, y+=15);
                y += answerLines.length * 12;
             }
             if(q.answer.imageUrls) {
                 for(const imageUrl of q.answer.imageUrls) {
                     if(isImageKey(imageUrl)) {
                         const answerImgData = await getImage(imageUrl);
                          if(answerImgData) {
                            const { width, height } = await getImageDimensions(answerImgData);
                            const aspectRatio = width / height;
                            let imgWidth = availableWidth / 2 - 5; // half width for answers
                            let imgHeight = imgWidth / aspectRatio;
                            
                            checkPageBreak(imgHeight + 10);
                            doc.addImage(answerImgData, 'JPEG', margin, y + 5, imgWidth, imgHeight);
                            y += imgHeight + 10;
                        }
                     }
                 }
             }
        }
        
        if (i < questions.length - 1) {
            y += 20; // Extra space before next question's separator line
        }
    }

    doc.save(`restudy-exam-${exam.name.replace(/\s+/g, '_')}.pdf`);
};
