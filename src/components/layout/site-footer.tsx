export function SiteFooter() {
  return (
    <footer className="border-t py-8">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Walmal. All rights reserved.
      </div>
    </footer>
  )
}
