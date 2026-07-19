import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const assetsDir = path.resolve('dist', 'assets')
const files = await readdir(assetsDir)
const woff2 = files.find((file) => /^remixicon-.*\.woff2$/.test(file))

if (!woff2) {
  throw new Error('remixicon woff2 asset not found')
}

const fontFace = `@font-face{font-family:"remixicon";src:url("./${woff2}") format("woff2");font-display:swap}`

await Promise.all(files
  .filter((file) => /^remixicon-.*\.(eot|ttf|woff|svg)$/.test(file))
  .map((file) => rm(path.join(assetsDir, file), { force: true })))

await Promise.all(files
  .filter((file) => file.endsWith('.css'))
  .map(async (file) => {
    const filePath = path.join(assetsDir, file)
    const css = await readFile(filePath, 'utf8')
    const nextCSS = css.replace(/@font-face\{font-family:"remixicon";[^}]+}/, fontFace)
    if (nextCSS !== css) {
      await writeFile(filePath, nextCSS)
    }
  }))
