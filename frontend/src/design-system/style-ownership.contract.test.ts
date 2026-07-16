import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const sourceRoot = resolve('src')
const designSystemRoot = resolve(sourceRoot, 'design-system')

const collectCssFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (path.startsWith(designSystemRoot)) return []
    if (entry.isDirectory()) return collectCssFiles(path)
    return entry.isFile() && entry.name.endsWith('.css') ? [path] : []
  })

const externalCssFiles = collectCssFiles(sourceRoot)

const componentVisualDeclaration =
  /(?:^|;)\s*(?:animation(?:-[\w-]+)?|appearance|backdrop-filter|background(?:-[\w-]+)?|border(?:-[\w-]+)?|box-shadow|color|filter|font(?:-[\w-]+)?|letter-spacing|opacity|outline(?:-[\w-]+)?|padding(?:-[\w-]+)?|text-shadow|transform|transition(?:-[\w-]+)?)\s*:/m

// Consumer classes may size, position, and space a component in a product layout, but component
// paint remains owned by public ODS props and variants. Pseudo-elements are product decoration.
const consumerVisualDeclaration =
  /(?:^|;)\s*(?:backdrop-filter|background(?:-[\w-]+)?|border(?:-[\w-]+)?|box-shadow|color|filter|outline(?:-[\w-]+)?|text-shadow)\s*:/m

const formatLocation = (path: string, source: string, offset: number) => {
  const line = source.slice(0, offset).split('\n').length
  return `${relative(process.cwd(), path)}:${line}`
}

const isProductionTsx = (path: string) =>
  path.endsWith('.tsx') &&
  !path.endsWith('.test.tsx') &&
  !path.endsWith('.spec.tsx') &&
  !path.startsWith(designSystemRoot) &&
  !path.includes(`${resolve(sourceRoot, 'test')}/`)

const collectProductionTsxFiles = (directory = sourceRoot): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (path.startsWith(designSystemRoot)) return []
    if (entry.isDirectory()) return collectProductionTsxFiles(path)
    return entry.isFile() && isProductionTsx(path) ? [path] : []
  })

interface ComponentClassUsage {
  className: string
  locations: string[]
}

const collectStaticClassTokens = (node: ts.Node) => {
  const tokens = new Set<string>()

  const visit = (candidate: ts.Node) => {
    if (ts.isStringLiteralLike(candidate)) {
      for (const token of candidate.text.split(/\s+/).filter(Boolean)) tokens.add(token)
      return
    }
    ts.forEachChild(candidate, visit)
  }

  visit(node)
  return tokens
}

const collectOdsConsumerClasses = (): ComponentClassUsage[] => {
  const usages = new Map<string, Set<string>>()

  for (const path of collectProductionTsxFiles()) {
    const source = readFileSync(path, 'utf8')
    const sourceFile = ts.createSourceFile(
      path,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const odsImports = new Set<string>()

    for (const statement of sourceFile.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        statement.moduleSpecifier.text !== '@/design-system'
      ) {
        continue
      }
      const bindings = statement.importClause?.namedBindings
      if (!bindings || !ts.isNamedImports(bindings)) continue
      for (const element of bindings.elements) odsImports.add(element.name.text)
    }

    const visit = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const rootName = node.tagName.getText(sourceFile).split('.')[0]
        if (odsImports.has(rootName)) {
          const classNameAttribute = node.attributes.properties.find(
            (attribute): attribute is ts.JsxAttribute =>
              ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === 'className',
          )
          if (classNameAttribute?.initializer) {
            const line =
              sourceFile.getLineAndCharacterOfPosition(classNameAttribute.getStart(sourceFile))
                .line + 1
            const location = `${relative(process.cwd(), path)}:${line}`
            for (const token of collectStaticClassTokens(classNameAttribute.initializer)) {
              const tokenUsages = usages.get(token) ?? new Set<string>()
              tokenUsages.add(location)
              usages.set(token, tokenUsages)
            }
          }
        }
      }
      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
  }

  return [...usages.entries()].map(([className, locations]) => ({
    className,
    locations: [...locations].sort(),
  }))
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const selectorPaintsConsumerClass = (selector: string, className: string) => {
  const classPattern = new RegExp(`\\.${escapeRegExp(className)}(?![\\w-])`)

  return selector.split(',').some((part) => {
    const rightmostCompound =
      part
        .trim()
        .split(/\s+|[>+~]/)
        .filter(Boolean)
        .at(-1) ?? ''
    if (/::(?:after|before)\b/.test(rightmostCompound)) return false
    return classPattern.test(rightmostCompound)
  })
}

describe('Orange Design System stylesheet ownership', () => {
  it('keeps ODS anatomy private to the design-system package', () => {
    const violations: string[] = []

    for (const path of externalCssFiles) {
      const source = readFileSync(path, 'utf8')
      for (const match of source.matchAll(/\.ods-[\w-]+__[\w-]+/g)) {
        violations.push(`${formatLocation(path, source, match.index)} ${match[0]}`)
      }
    }

    expect(
      violations,
      `Page CSS must use public props/classes instead of ODS anatomy:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('keeps ODS component visuals in design-system styles', () => {
    const violations: string[] = []

    for (const path of externalCssFiles) {
      const source = readFileSync(path, 'utf8')
      for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selector = match[1].trim()
        const declarations = match[2]
        if (!selector.includes('.ods-') || !componentVisualDeclaration.test(declarations)) continue
        violations.push(
          `${formatLocation(path, source, match.index)} ${selector.replace(/\s+/g, ' ')}`,
        )
      }
    }

    expect(
      violations,
      `ODS visual variants belong in the design system, not page CSS:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('prevents consumer className escapes from repainting ODS components', () => {
    const violations: string[] = []
    const consumerClasses = collectOdsConsumerClasses()

    for (const path of externalCssFiles) {
      const source = readFileSync(path, 'utf8')
      for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selector = match[1].trim()
        const declarations = match[2]
        if (!consumerVisualDeclaration.test(declarations)) continue

        for (const usage of consumerClasses) {
          if (!selectorPaintsConsumerClass(selector, usage.className)) continue
          violations.push(
            `${formatLocation(path, source, match.index)} ${selector.replace(/\s+/g, ' ')} ` +
              `(className used at ${usage.locations.join(', ')})`,
          )
        }
      }
    }

    expect(
      violations,
      `Consumer classes on ODS components must not repaint them; use public variants:\n${violations.join('\n')}`,
    ).toEqual([])
  })
})
