export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const base64ToBlob = async (base64: string): Promise<Blob> => {
    const res = await fetch(base64);
    return await res.blob();
};


export const calculateHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    // Add time to make sure date is parsed in local timezone correctly
    return new Date(dateString + 'T00:00:00').toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};
