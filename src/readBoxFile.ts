import { execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as tmp from "tmp";
import { BoxClient } from "box-typescript-sdk-gen";
import { fileURLToPath } from "url";
import { getRequiredEnv } from "./env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function readBoxFile(
  client: BoxClient,
  fileId: string
): Promise<string> {
  const fileInfo = await client.files.getFileById(fileId);
  const fileType = fileInfo.name?.split(".").pop()?.toLowerCase();

  if (!fileType) throw new Error("Failed to determine file type");

  const fileContentStream = await client.downloads.downloadFile(fileId);
  if (!fileContentStream) throw new Error("Failed to download file content");

  const fileContent = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    fileContentStream.on("data", (chunk) => chunks.push(chunk));
    fileContentStream.on("end", () => resolve(Buffer.concat(chunks)));
    fileContentStream.on("error", reject);
  });

  // 対応拡張子リスト（MarkItDown対応形式）
  const handledByPython = ["pdf", "docx", "pptx", "xlsx"];

  if (handledByPython.includes(fileType)) {
    // 一時ファイルに保存
    const tmpFile = tmp.fileSync({ postfix: `.${fileType}` });
    fs.writeFileSync(tmpFile.name, fileContent);

    return new Promise<string>((resolve, reject) => {
      const pythonPath = path.join(__dirname, "convert.py");

      execFile(
        getRequiredEnv("PYTHON_EXE"),
        [pythonPath, tmpFile.name],
        (
          error: { message: any },
          stdout: string | PromiseLike<string>,
          stderr: any
        ) => {
          tmpFile.removeCallback();

          if (error) {
            reject(`Python Error: ${stderr || error.message}`);
          } else {
            resolve(stdout);
          }
        }
      );
    });
  }

  // fallback: テキスト形式ならそのまま読む
  switch (fileType) {
    case "txt":
    case "md":
    case "json":
    case "csv":
      return fileContent.toString();
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
