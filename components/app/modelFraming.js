// A bounding sphere fits every model orientation, including narrow phone views.
export const modelFitDistance = (size, verticalFovDegrees, aspect) => {
  const radius = Math.max(Math.hypot(size.x, size.y, size.z) / 2, 0.001)
  const verticalHalfFov = verticalFovDegrees * Math.PI / 360
  const limitingHalfFov = Math.atan(Math.tan(verticalHalfFov) * Math.min(Math.max(aspect, 0.001), 1))
  return radius / Math.sin(limitingHalfFov) * 1.1
}
