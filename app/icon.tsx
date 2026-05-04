import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#1d4ed8',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          gap: 4,
        }}
      >
        <div style={{ background: 'white', width: 18, height: 4, borderRadius: 2 }} />
        <div style={{ background: 'white', width: 18, height: 4, borderRadius: 2, opacity: 0.8 }} />
        <div style={{ background: 'white', width: 18, height: 4, borderRadius: 2, opacity: 0.6 }} />
      </div>
    ),
    { ...size },
  )
}
