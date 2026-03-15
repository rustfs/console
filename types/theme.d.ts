export interface ThemeManifest {
  schemaVersion: number
  id: string
  name: string
  brand: {
    name: string
    shortName?: string
    description?: string
  }
  assets: {
    logo: string
    logoCompact?: string
    userAvatar?: string
  }
  links: {
    website?: string
    documentation?: string
    github?: string
    x?: string
  }
}
