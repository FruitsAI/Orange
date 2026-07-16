import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(resolve(path), 'utf8')

const dataSyncSource = readSource('src/components/settings/DataSyncPanel.tsx')
const dictionarySource = readSource('src/components/settings/DictionaryManagement.tsx')
const mainCss = readSource('src/assets/main.css')
const notificationSource = readSource('src/components/settings/NotificationManagement.tsx')
const radioCss = readSource('src/design-system/components/radio-group/radio-group.css')
const radioSource = readSource('src/design-system/components/radio-group/RadioGroup.tsx')
const settingsCss = readSource('src/styles/settings.css')
const settingsSource = readSource('src/views/SettingsView.tsx')
const tabsCss = readSource('src/design-system/components/tabs/tabs.css')
const tokenSource = readSource('src/components/settings/TokenManagement.tsx')
const userSource = readSource('src/components/settings/UserManagement.tsx')

const settingsProductionSource = [
  dataSyncSource,
  dictionarySource,
  notificationSource,
  settingsSource,
  tokenSource,
  userSource,
].join('\n')

describe('settings design-system ownership contract', () => {
  it('keeps feature CSS on business layout without reaching into ODS anatomy', () => {
    expect(settingsCss).not.toContain('.ods-')
    expect(settingsCss).not.toMatch(/var\(--(?!ods-)/)
    expect(settingsCss).not.toContain('!important')
  })

  it('uses shared card radios for theme, database, and token-expiry choices', () => {
    expect(radioSource).toContain("variant?: 'card' | 'default'")
    expect(radioSource).toContain('columns?: 1 | 2 | 3')
    expect(radioCss).toContain(".ods-radio[data-variant='card']")
    expect(settingsSource).toContain('columns={3}')
    expect(dataSyncSource).toContain('columns={2}')
    expect(tokenSource).toContain('columns={2}')
    expect(settingsProductionSource.match(/variant="card"/g)).toHaveLength(3)
  })

  it('uses the shared navigation Tabs treatment for both settings sidebars', () => {
    expect(tabsCss).toContain(".ods-tabs__list[data-variant='navigation']")
    expect(settingsSource).toContain('variant="navigation"')
    expect(dictionarySource).toContain('variant="navigation"')
  })

  it('does not attach legacy primitive classes to ODS controls', () => {
    expect(settingsProductionSource).not.toMatch(
      /(?:dev-create-btn|dev-action-btn|sync-action-btn|update-btn|action-btn|dev-expiry-option|sync-db-type-option)/,
    )
    expect(settingsProductionSource).not.toContain('className="settings-modal"')
    expect(settingsProductionSource).not.toMatch(/className=.*(?:role-admin|status-active)/)
  })

  it('keeps portalled form spacing on an explicit modal-body layout hook', () => {
    expect(settingsCss).toMatch(/\.settings-modal-body\s*\{[\s\S]*display:\s*grid/)
    expect(settingsCss).not.toMatch(/\.settings-modal-body\s+\.ods-/)
    expect(settingsProductionSource).toContain('className="settings-modal-body"')
  })

  it('removes Settings component implementations from the legacy global bundle', () => {
    expect(mainCss).not.toContain('components/settings/')
    expect(mainCss).not.toContain('views/SettingsView.tsx')
    expect(mainCss).not.toMatch(
      /\.(?:dev-create-btn|dev-action-btn|sync-action-btn|update-btn|action-btn)(?:[.\s:{]|$)/,
    )
  })

  it('composes every settings panel heading from the shared SectionHeader pattern', () => {
    expect(settingsProductionSource.match(/<SectionHeader\b/g)).toHaveLength(11)
    expect(settingsProductionSource).not.toMatch(
      /className="(?:nav-header|dev-header|dev-header-content|dev-title-section|dev-title-info|dev-title|dev-subtitle|dev-icon-wrapper|appearance-header|appearance-header-main|appearance-title-wrapper|appearance-title-content|appearance-title|appearance-subtitle|appearance-icon|sync-title-wrapper|sync-title|sync-subtitle|sync-icon)"/,
    )
    expect(settingsCss).not.toMatch(
      /\.(?:nav-header|dev-header|dev-header-content|dev-title-section|dev-title-info|dev-title|dev-subtitle|dev-icon-wrapper|appearance-header|appearance-header-main|appearance-title-wrapper|appearance-title-content|appearance-title|appearance-subtitle|appearance-icon|sync-title-wrapper|sync-title|sync-subtitle|sync-icon)(?:[\s,.:{]|$)/,
    )
  })

  it('uses ODS Table and form patterns instead of rebuilding card slots and tabular rows', () => {
    expect(dataSyncSource).toContain('<Table.Root')
    expect(dataSyncSource).toContain('<Table.Header>')
    expect(dataSyncSource).toContain('<Table.Column')
    expect(dataSyncSource).toContain('<Table.Body>')
    expect(dataSyncSource).not.toMatch(
      /className="sync-(?:form-header|form-body|form-footer|table-header|table-body|data-grid|data-row)"/,
    )
    expect(settingsCss).not.toMatch(
      /\.settings-view \.sync-(?:form-header|form-body|form-footer|table-header|table-body|data-grid|data-row)(?:[\s,.:{]|$)/,
    )
  })
})
