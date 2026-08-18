export const uploadToCloudinary = async (uri: string): Promise<string | null> => {
  const CLOUD_NAME = 'qbl22xip'; // <- Seu Cloud name
  const UPLOAD_PRESET = 'mmpaixao_preset'; // <- Seu Preset Unsigned

  const formData = new FormData();
  formData.append('file', { 
    uri, 
    type: 'image/jpeg', 
    name: 'upload.jpg', 
  } as any);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return data.secure_url;
  } catch (e) {
    console.log('Erro Cloudinary:', e);
    return null;
  }
};