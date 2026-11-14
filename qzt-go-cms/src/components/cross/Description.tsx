import { Fragment } from "react";

/**
 * 详情正文渲染(MVP 折行方案): 双换行分段 <p>, 段内单换行 <br>。
 * 后端 description 为纯文本约定——不解析 markdown, 不用
 * dangerouslySetInnerHTML(转义 HTML 也不做, 无注入面)。
 */
export function Description({ text }: { text?: string }) {
  if (!text || !text.trim()) return null;
  const paras = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4 text-sm leading-relaxed text-normal">
      {paras.map((p, i) => (
        <p key={i}>
          {p.split("\n").map((line, j, arr) => (
            <Fragment key={j}>
              {line}
              {j < arr.length - 1 && <br />}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
