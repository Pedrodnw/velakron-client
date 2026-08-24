import QRCode from 'qrcode'
import { Download, Printer, ScanLine } from 'lucide-react'
import { useMemo } from 'react'
import { Button, VelakronLogo } from '../../components/design-system'
import LinkWrap from '../../components/LinkWrap'
import Seo from '../../components/Seo'

const SalesDemoQr = ({ svg, targetUrl }) => {
  const downloadUrl = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, [svg])
  return <>
    <Seo title='Sales Demo QR' description='Printable Velakron Sales Demo QR code.' path='/sales-demo/qr' noIndex />
    <main className='tradeShowQrPage'>
      <section className='tradeShowQrPoster'>
        <VelakronLogo priority sizes='184px' />
        <p className='technicalLabel'>Interactive product experience</p>
        <h1>See Velakron from your side of the supply chain.</h1>
        <p>Scan to choose an OEM or Supplier workspace. No password required.</p>
        <div className='tradeShowQrPoster__code' dangerouslySetInnerHTML={{ __html: svg }} />
        <div className='tradeShowQrPoster__scan'><ScanLine aria-hidden='true' /> Scan to begin</div>
        <small>{targetUrl.replace(/^https?:\/\//, '')}</small>
      </section>
      <div className='tradeShowQrActions'>
        <Button onClick={() => window.print()}><Printer aria-hidden='true' /> Print sign</Button>
        <a className='vk-button vk-button--secondary' href={downloadUrl} download='velakron-sales-demo-qr.svg'><Download aria-hidden='true' /> Download QR</a>
        <LinkWrap href='/sales-demo'>Open guest page</LinkWrap>
      </div>
    </main>
  </>
}

SalesDemoQr.getLayout = page => page

export const getStaticProps = async () => {
  const targetUrl = process.env.NEXT_PUBLIC_SALES_DEMO_URL || process.env.NEXT_PUBLIC_IMTS_DEMO_URL || 'https://velakron.com/sales-demo'
  const svg = await QRCode.toString(targetUrl, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 720,
    color: { dark: '#07101b', light: '#ffffff' },
  })
  return { props: { svg, targetUrl } }
}

export default SalesDemoQr
