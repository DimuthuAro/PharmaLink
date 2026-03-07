const ProtectedTestPage = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold underline">Protected Test Page ENV Environment == {import.meta.env.VITE_AUTH_DEV} </h1>
    </div>
  )
}
export default ProtectedTestPage