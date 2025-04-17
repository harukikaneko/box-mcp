import sys
from markitdown import MarkItDown

if __name__ == "__main__":
    md = MarkItDown()
    result = md.convert(sys.argv[1])  # ファイルパスを受け取る
    print(result.text_content)