import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { stringify } from "yaml";

const toResponse = (result: unknown) => {
  if (typeof result === "string" && result === "") {
    return "success";
  }

  if (result === undefined || result === null) {
    return "success";
  }

  if (Array.isArray(result)) return result;

  if (typeof result === "object") {
    try {
      // @ts-expect-error
      if (result["status"] !== undefined) {
        return result;
      }

      return {
        status: "success",
        ...result,
      };
    } catch {
      return result;
    }
  }

  return result;
};

export const formatTool = async (
  cb: () => unknown
): Promise<CallToolResult> => {
  try {
    const result = await cb();
    const responseData = toResponse(result);
    
    // JSONデータの場合はそのままJSON形式で返す
    if (typeof responseData === 'object' && responseData !== null && 'type' in responseData && responseData.type === 'error') {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(responseData, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: stringify(responseData),
        },
      ],
    };
  } catch (error) {
    console.error("Error in formatTool:", error);

    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error: ${
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : String(error)
          }`,
        },
      ],
    };
  }
};
