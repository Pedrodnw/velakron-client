const LegacyImtsLeads = () => null

export const getServerSideProps = async () => ({
  redirect: {
    destination: '/app/crm/leads',
    permanent: false,
  },
})

export default LegacyImtsLeads
