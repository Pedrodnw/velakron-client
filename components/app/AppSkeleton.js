const AppSkeleton = ({ lines = 3 }) => <div className='appSkeleton' aria-busy='true' aria-label='Loading'>
  {Array.from({ length: lines }, (_, index) => <span key={index} />)}
</div>

export default AppSkeleton
