const ReferralRedirect = () => null

const referralCodePattern = /^sp_[A-Za-z0-9_-]{20,60}$/

export const getServerSideProps = async ({ params }) => {
  const code = typeof params?.code === 'string' ? params.code : ''
  if (!referralCodePattern.test(code)) return { notFound: true }
  return {
    redirect: {
      destination: `/request-demo?ref=${encodeURIComponent(code)}`,
      permanent: false,
    },
  }
}

export default ReferralRedirect
