import axios from 'axios'

const absoluteTarget = target => /^https?:\/\//i.test(String(target || ''))

export const resolveFileTransferTarget = target => absoluteTarget(target)
  ? target
  : `${process.env.NEXT_PUBLIC_API_URL}${target}`

export const uploadFileToIntent = async ({ file, onProgress = () => {}, upload }) => {
  const directProviderUpload = absoluteTarget(upload.target)
  const target = resolveFileTransferTarget(upload.target)
  await axios.put(target, file, {
    headers: upload.headers || { 'Content-Type': upload.content_type },
    withCredentials: !directProviderUpload,
    onUploadProgress: event => {
      if (!event.total) return
      onProgress(Math.round((event.loaded / event.total) * 100))
    },
  })
}

export const openDownloadTarget = target => {
  if (typeof window === 'undefined') return
  window.location.assign(resolveFileTransferTarget(target))
}
