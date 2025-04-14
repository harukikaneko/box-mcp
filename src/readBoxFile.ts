import { BoxClient } from "box-typescript-sdk-gen";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export async function readBoxFile(client: BoxClient, fileId: string) {
  const fileInfo = await client.files.getFileById(fileId);
  const fileType = fileInfo.name?.split(".").pop()?.toLowerCase();

  if (!fileType) {
    throw new Error("Failed to determine file type");
  }

  const fileContentStream = await client.downloads.downloadFile(fileId);

  if (!fileContentStream) {
    throw new Error("Failed to download file content");
  }

  const fileContent = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    fileContentStream.on("data", (chunk) => chunks.push(chunk));
    fileContentStream.on("end", () => resolve(Buffer.concat(chunks)));
    fileContentStream.on("error", reject);
  });

  let textContent: string;

  // Process based on file type
  switch (fileType) {
    case "pdf":
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(fileContent.buffer),
        useSystemFonts: true,
        verbosity: 0,
      });

      const pdfDocument = await loadingTask.promise;

      // Extract text from all pages
      let extractedPages: string[] = [];
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        extractedPages.push(pageText);
      }

      textContent = extractedPages.join("\n\n");
      break;

    case "doc":
    case "docx":
    case "txt":
    case "md":
    case "json":
    case "csv":
      textContent = fileContent.toString();
      break;

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }

  return textContent;
}
