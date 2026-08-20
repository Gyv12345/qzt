import { Typography } from 'antd'
import { FIELD_META, GROUPS } from './fieldMeta'

const { Text } = Typography

interface TypePaletteProps {
  loading: boolean
  onAdd: (type: string) => void
}

/** 左栏:字段类型面板(点击类型新增字段) */
export default function TypePalette({ loading, onAdd }: TypePaletteProps) {
  return (
    <div
      style={{
        flex: 1,
        background: '#fff',
        borderRadius: 8,
        padding: 16,
        border: '1px solid #f0f0f0',
      }}
    >
      <Text strong style={{ display: 'block', marginBottom: 12 }}>
        字段类型
      </Text>
      {GROUPS.map((g) => (
        <div key={g.title} style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            {g.title}
          </Text>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {g.types.map((t) => (
              <div
                key={t}
                className="field-type-tile"
                onClick={() => onAdd(t)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 10px',
                  border: '1px solid #f0f0f0',
                  borderRadius: 6,
                  cursor: loading ? 'wait' : 'pointer',
                  fontSize: 13,
                  background: '#fafafa',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                <span style={{ fontSize: 14 }}>{FIELD_META[t]?.icon || '▫'}</span>
                <span>{FIELD_META[t]?.label || t}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
