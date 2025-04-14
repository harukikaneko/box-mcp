import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { version } from "../package.json";
import { getRequiredEnv } from "./env";
import { stringify } from "yaml";
import { BoxClient, BoxJwtAuth, JwtConfig } from "box-typescript-sdk-gen";
import { readBoxFile } from "./readBoxFile";
import { formatTool } from "./toolResponse";

export const createServer = () => {
  const server = new McpServer({
    name: "box-server",
    version: version,
  });

  const decodeJwt = Buffer.from(
    getRequiredEnv("BOX_JWT_BASE64"),
    "base64"
  ).toString("utf-8");
  const jwtConfig = JwtConfig.fromConfigJsonString(decodeJwt);
  const jwtAuth = new BoxJwtAuth({ config: jwtConfig });
  const userAuth = jwtAuth.withUserSubject(getRequiredEnv("BOX_USER_ID"));

  const client = new BoxClient({
    auth: userAuth,
  });

  // Search files in Box
  server.tool(
    "search_box_files",
    "Search for files in Box with various filters and pagination support.",
    {
      query: z.string().optional(),
      fileExtensions: z.array(z.string()).optional(),
      type: z.enum(["file", "folder", "web_link"]).default("file"),
      ancestorFolderIds: z.array(z.string()).optional(),
      createdAtRange: z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
        })
        .optional(),
      updatedAtRange: z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
        })
        .optional(),
      size: z
        .object({
          from: z.number().optional(),
          to: z.number().optional(),
        })
        .optional(),
      trashContent: z
        .enum(["non_trashed_only", "trashed_only", "all"])
        .default("non_trashed_only"),
      sortBy: z.enum(["modified_at", "name", "relevance"]).default("relevance"),
      direction: z.enum(["ASC", "DESC"]).default("DESC"),
      limit: z.number().min(1).max(100).default(30),
      offset: z.number().default(0),
    },
    async (input) => {
      return await formatTool(async () => {
        const searchResults = await client.search.searchForContent({
          query: input.query,
          fileExtensions: input.fileExtensions,
          type: input.type,
          ancestorFolderIds: input.ancestorFolderIds,
          createdAtRange: input.createdAtRange
            ? ([input.createdAtRange.from, input.createdAtRange.to].filter(
                Boolean
              ) as [string, string])
            : undefined,
          updatedAtRange: input.updatedAtRange
            ? ([input.updatedAtRange.from, input.updatedAtRange.to].filter(
                Boolean
              ) as [string, string])
            : undefined,
          sizeRange: input.size
            ? ([input.size.from, input.size.to].filter(Boolean) as [
                number,
                number
              ])
            : undefined,
          trashContent: input.trashContent,
          sort: input.sortBy,
          direction: input.direction,
          limit: input.limit,
          offset: input.offset,
        });

        return {
          content: [
            {
              type: "text",
              text: stringify({
                entries: searchResults.entries,
                totalCount: searchResults.totalCount,
                nextOffset: input.offset + (searchResults.entries?.length ?? 0),
              }),
            },
          ],
        };
      });
    }
  );

  // Get file content from Box
  server.tool(
    "get_box_file_content",
    "Retrieve and read the content of a file from Box. Supports various file formats including PDF, TXT, DOC, DOCX, MD, JSON, and CSV.",
    {
      fileId: z.string().describe("The ID of the file to retrieve from Box"),
    },
    async (input) =>
      await formatTool(async () => {
        const fileContent = await readBoxFile(client, input.fileId);

        return {
          content: [
            {
              type: "text",
              text: fileContent,
            },
          ],
        };
      })
  );

  // Get file information
  server.tool(
    "get_box_file_info",
    "Get detailed information about a specific file in Box",
    {
      fileId: z.string().describe("The ID of the file to get information for"),
    },
    async (input) =>
      await formatTool(async () => {
        const fileInfo = await client.files.getFileById(input.fileId);

        return {
          content: [
            {
              type: "text",
              text: stringify(fileInfo),
            },
          ],
        };
      })
  );

  // List folder contents
  server.tool(
    "list_box_folder_contents",
    "List files and subfolders contained in a Box folder",
    {
      folderId: z
        .string()
        .default("0")
        .describe("The ID of the folder to list (use '0' for root folder)"),
    },
    async (input) =>
      await formatTool(async () => {
        const folderItems = await client.folders.getFolderItems(input.folderId);

        return {
          content: [
            {
              type: "text",
              text: stringify({
                entries: folderItems.entries,
                totalCount: folderItems.totalCount,
              }),
            },
          ],
        };
      })
  );

  return { server };
};
