import { ImageResponse } from 'next/og'
import { getLogoIconDataUrl } from '@/lib/logo-data-url'

/** 512px source; browsers scale down for the tab (stays sharp on retina). */
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default async function Icon() {
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
          width={480}
          height={480}
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    { ...size }
  )
}
