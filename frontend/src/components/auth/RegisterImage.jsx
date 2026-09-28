import { useEffect, useState } from 'react'

const REGISTER_IMAGES = [
  '/images/register/img0.webp',
  '/images/register/img1.webp',
  '/images/register/img2.webp',
  '/images/register/img3.webp',
  '/images/register/img4.webp',
  '/images/register/img5.webp',
  '/images/register/img6.webp',
  '/images/register/img7.webp',
]

function RegisterImage() {
  const count = REGISTER_IMAGES.length
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setStep((s) => s + 1), 3000)
    return () => clearInterval(interval)
  }, [])

  const cycle = step % (count + 1)
  const position = Math.min(cycle, count)
  const instantReset = step > 0 && cycle === 0

  const slides = [...REGISTER_IMAGES, REGISTER_IMAGES[0]]

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="flex h-full w-full flex-col will-change-transform"
        style={{
          transform: `translateY(-${position * 100}%)`,
          transition: instantReset ? 'none' : 'transform 700ms ease-in-out',
        }}
      >
        {slides.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="h-full w-full shrink-0 object-cover object-center"
          />
        ))}
      </div>
    </div>
  )
}

export default RegisterImage