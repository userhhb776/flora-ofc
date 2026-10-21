/** True when a media link points to a video file (by extension). */
export const isVideo = (src?: string | null) => !!src && /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(src);
