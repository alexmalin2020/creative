export async function getProductImages(folderName: string): Promise<string[]> {
  try {
    const apiUrl = `https://api.github.com/repos/alexmalin2020/creative/contents/images/${folderName}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error(`Failed to fetch images for ${folderName}`);
      return [];
    }

    const files = await response.json();

    if (!Array.isArray(files)) {
      return [];
    }

    // Return local paths to images
    return files
      .filter((file: any) => file.type === 'file' && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name))
      .map((file: any) => `/images/${folderName}/${file.name}`);
  } catch (error) {
    console.error('Error fetching product images:', error);
    return [];
  }
}
