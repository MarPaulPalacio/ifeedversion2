function Loading() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-lg bg-white p-10 shadow-lg">
      <img
        className="mx-auto h-20 w-20 animate-[twinkle_1s_ease-in-out_infinite]"
        src="/assets/logo.png"
        alt="Loading..."
      />
    </div>
  )
}

export default Loading
