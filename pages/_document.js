import { Head, Html, Main, NextScript } from 'next/document'

const Document = () => (
  <Html lang='en' data-scroll-behavior='smooth'>
    <Head>
      <meta name='theme-color' content='#080b10' />
      <link rel='icon' href='/favicon.svg' type='image/svg+xml' />
    </Head>
    <body>
      <Main />
      <NextScript />
    </body>
  </Html>
)

export default Document
