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
        {/* coin stack: 3 horizontal bars */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              background: 'white',
              width: 18,
              height: 4,
              borderRadius: 2,
              opacity: 1 - i * 0.2,
            }}
          />
        ))}
      </div>
    ),
    { ...size },
  )
}
