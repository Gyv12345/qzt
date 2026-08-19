/**
 * 序号/排名胶囊,复刻 ProTable valueType="indexBorder" 的样式(前三名深色高亮,之后灰色)。
 * 用于原生 antd Table 的序号列,保持与全站 ProTable 序号样式一致。
 */
export default function IndexTag({ index }: { index: number }) {
  const no = index + 1
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 18,
        height: 18,
        fontSize: 12,
        lineHeight: '12px',
        color: '#fff',
        borderRadius: 9,
        backgroundColor: no > 3 ? '#979797' : '#314659',
      }}
    >
      {no}
    </span>
  )
}
