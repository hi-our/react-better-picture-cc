import React, { useState, useEffect } from 'react'
// import styles from './styles.global.styl'
import { useInView } from 'react-intersection-observer'

interface UIProps {
  /**
   * 图片地址
   */
  src: string
  /**
   * 图片布局方式
   */
  layout?: string
  /**
   * 图片Fit
   */
  objectFit?: string
  /**
   * 图片宽度
   */
  width?: number
  /**
   * 图片高度
   */
  height?: number
  /**
   * 七牛图片的最大宽度
   */
  maxImageWidth?: number
  /**
   * 图片高宽比 h / w
   */
  ratio?: number
  /**
   * 是否启用webp
   */
  enableWebp?: boolean
  /**
   * 禁用blur直接加载大图
   */
  disableBlur?: boolean
  /**
   * 自定义 ClassName
   */
  className: string
  /**
   * 用来扩展或缩小rootBounds这个矩形的大小
   * 从而影响intersectionRect交叉区域的大小
   * 它使用CSS的定义方法，比如10px 20px 30px 40px，表示 top、right、bottom 和 left 四个方向的值
   */
  rootMargin?: string
  /**
   * 是否使用loading动画
   */
  withAnimation?: boolean
  /**
   * 点击方法
   */
  onClick: () => void
}


const PREFIX = 'xxl'

const cx = require('classnames/bind') //.bind(styles)

const PREFIX_CLASS = PREFIX + '-better-picture'

const getHttpsSrc = (src = '') => src.replace('http://', 'https://')

const detectAspectRatio = () => {
  const cssSupports = !!(window.CSS && window.CSS.supports)
  return cssSupports ? window.CSS.supports('aspect-ratio', '1/1') : false
}

const isSupportRatio = detectAspectRatio()

// 计算七牛云所需图片
const compressImage = (
  src: string,
  maxImageWidth: number,
  needWebp?: boolean
): string => {
  if (src.startsWith('data:')) return src

  let compressedSrc = `${getHttpsSrc(src)}?imageView2/2`

  if (maxImageWidth) {
    compressedSrc = `${compressedSrc}/w/${maxImageWidth}`
  }

  if (needWebp) {
    compressedSrc = `${compressedSrc}/format/webp/ignore-error/1`
  }

  return compressedSrc
}

const getImgRealProps = ({
  src,
  width,
  height,
  ratio,
  maxImageWidth
}: UIProps) => {
  if (ratio) {
    width = maxImageWidth
    height = parseInt(maxImageWidth * ratio)
  } else if (width && height) {
    ratio = height / width
  }

  let blurSrc = getHttpsSrc(src) + `?imageMogr2/thumbnail/30x30/blur/3x5`

  return {
    widthInt: width,
    heightInt: height,
    ratioInt: ratio || 0,
    blurSrc,
    maxWidthInt: maxImageWidth || width * 3
  }
}

// See https://stackoverflow.com/q/39777833/266535 for why we use this ref
// handler instead of the img's onLoad attribute.
function handleLoading(img, onLoadingComplete) {
  if (!img) {
    return
  }

  // console.log(`img.src`, img.src)
  const handleLoad = () => {
    if (!img.src.startsWith('data:')) {
      const p = 'decode' in img ? img.decode() : Promise.resolve()
      p.catch(() => {}).then(() => {
        if (onLoadingComplete) {
          onLoadingComplete()
        }
      })
    }
  }
  if (img.complete) {
    // If the real image fails to load, this will still remove the placeholder.
    // This is the desired behavior for now, and will be revisited when error
    // handling is worked on for the image component itself.
    handleLoad()
  } else {
    img.onload = handleLoad
  }
}


export default function BetterPicture({
  src,
  layout,
  objectFit,
  width,
  height,
  ratio,
  maxImageWidth,
  className,
  disableBlur,
  enableWebp,
  rootMargin,
  withAnimation,
  onClick
}: UIProps) {
  const {
    blurSrc,
    widthInt,
    heightInt,
    ratioInt,
    maxWidthInt
  } = getImgRealProps({ src, width, height, ratio, maxImageWidth })

  const [setRef, inView] = useInView({
    threshold: .25,
  })

  const [isIntersected, setIsIntersected] = useState(false)
  const showBlur = ratioInt > 0 && !disableBlur
  const isVisible = disableBlur || isIntersected
  const srcAttr = isVisible ? src : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  
  const [isLoaded, setLoaded] = useState(disableBlur)
  const [blurLoading, setBlurLoading] = useState(showBlur)
  useEffect(() => {
    if (inView) setIsIntersected(true)
  }, [inView])
  
  // picture包装层
  let innerStyle = {}
  let innerClassName = {}
  // 实际图片
  let imgStyle = {}

  if (showBlur) {
    if (isSupportRatio) {
      // imgStyle.aspectRatio = `${widthInt}/${heightInt}`
      imgStyle[`--${PREFIX_CLASS}-ratio`] = `${widthInt}/${heightInt}`
    } else {
      innerStyle = {
        paddingTop: `${heightInt / widthInt * 100}%`,
      }
      innerClassName = PREFIX_CLASS + '-inner-abs'

      if (layout === 'fixed') {
        innerStyle.width = widthInt + 'px'
      }
    }
  }

  if (objectFit) {
    imgStyle.objectFit = objectFit
  }

  const onLoadingComplete = () => {
    !isLoaded && setLoaded(true)
  }

  const onAnimationEnd = () => {
    setBlurLoading(false)
  }

  return (
    <div
      className={cx(PREFIX_CLASS, className, {
        [PREFIX_CLASS + '-' + (layout || 'layout-none')]: true,
        [PREFIX_CLASS + '-with-blur']: ratioInt > 0,
        [PREFIX_CLASS + '-with-ani']: withAnimation,
        [PREFIX_CLASS + '-img-done']: isLoaded
      })}
      onClick={onClick}
    >
      {blurLoading && (
        <>
          {isSupportRatio ? (
            <img
              className={cx(PREFIX_CLASS + '-blur', {
                [PREFIX_CLASS + '-blur-hide']: isLoaded
              })}
              width={widthInt}
              src={blurSrc}
              style={{
                [`--${PREFIX_CLASS}-ratio`]: `${widthInt}/${heightInt}`
              }}
            />
          ) : (
            <svg
              className={cx(PREFIX_CLASS + '-blur', {
                [PREFIX_CLASS + '-blur-show']: isLoaded
              })}
              width={widthInt}
              height={heightInt}
              version='1.1'
              xmlns='http://www.w3.org/2000/svg'
              xmlnsXlink='http://www.w3.org/1999/xlink'
              style={{
                backgroundImage: `url(${blurSrc})`
              }}
            />
          )}
        </>
      )}
      <picture
        className={cx(PREFIX_CLASS + '-inner', innerClassName)}
        style={innerStyle}
      >
        {!srcAttr.startsWith('data:') && enableWebp && (
          <source
            type='image/webp'
            srcSet={compressImage(srcAttr, maxWidthInt, true)}
          />
        )}
        <img
          src={compressImage(srcAttr, maxWidthInt)}
          className={cx(PREFIX_CLASS + '-img')}
          width={widthInt}
          onAnimationEnd={onAnimationEnd}
          ref={(img) => {
            setRef(img)
            !isLoaded && handleLoading(img, onLoadingComplete)
          }}
          style={imgStyle}
        />
      </picture>
    </div>
  )
}
