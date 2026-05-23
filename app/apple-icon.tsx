import { ImageResponse } from 'next/og'
import { getLogoIconDataUrl } from '@/lib/logo-data-url'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default async function AppleIcon() {
  const logo = await getLogoIconDataUrl()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050505',
        }}
      >
        <img
          src={logo}
          alt=""
          width={168}
          height={168}
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    { ...size }
  )
}
