import { Suspense } from "react"
import ActionInterface from "../../action-interface"

export default function Page() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-background text-foreground">Loading...</div>}>
      <ActionInterface />
    </Suspense>
  )
}
