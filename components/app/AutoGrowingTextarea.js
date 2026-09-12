import { useLayoutEffect, useRef } from 'react'

// Keep message scrolling in the drawer instead of a second, nested touch scroller.
export default function AutoGrowingTextarea({ value, ...props }) {
  const ref = useRef(null)
  const resizeRef = useRef(() => {})
  useLayoutEffect(() => {
    const element = ref.current
    const resize = () => {
      const style = getComputedStyle(element)
      const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
      element.style.height = 'auto'
      element.style.height = `${Math.ceil(element.scrollHeight + border)}px`
    }
    resizeRef.current = resize
    resize()
    let width = element.clientWidth
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return
      width = element.clientWidth
      resize()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useLayoutEffect(() => { resizeRef.current() }, [value])
  return <textarea {...props} value={value} ref={ref} className='autoGrowingTextarea' />
}
