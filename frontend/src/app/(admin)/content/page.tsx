'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useContentPipeline } from 'fsdk-ts'
import type {
  ContentPipelineRule,
  KnownSender,
  PipelineRuleType,
  CreatePipelineRuleRequest,
  UpdatePipelineRuleRequest,
} from 'fsdk-ts'
import PageHeader from '@/components/PageHeader'
import ErrorMessage from '@/components/ErrorMessage'
import LoadingSpinner from '@/components/LoadingSpinner'

const RULE_TYPES: { value: PipelineRuleType; label: string; description: string }[] = [
  { value: 'dedup_strategy', label: 'Dedup Strategy', description: 'Duplicate detection method' },
  { value: 'keyword_block', label: 'Keyword Block', description: 'Block messages containing keywords' },
  { value: 'frequency_cap', label: 'Frequency Cap', description: 'Limit repeated content' },
  { value: 'sender_block', label: 'Sender Block', description: 'Block specific senders' },
  { value: 'sender_allow', label: 'Sender Allow', description: 'Allow only specific senders' },
]

const RULE_TYPE_COLORS: Record<PipelineRuleType, string> = {
  dedup_strategy: 'bg-blue-100 text-blue-800',
  keyword_block: 'bg-red-100 text-red-800',
  frequency_cap: 'bg-yellow-100 text-yellow-800',
  sender_block: 'bg-purple-100 text-purple-800',
  sender_allow: 'bg-green-100 text-green-800',
}

function defaultConfig(ruleType: PipelineRuleType): Record<string, unknown> {
  switch (ruleType) {
    case 'dedup_strategy':
      return { method: 'source_content_id' }
    case 'keyword_block':
      return { keywords: [], case_sensitive: false, action: 'skip' }
    case 'frequency_cap':
      return { max_occurrences: 3, window_hours: 24, action: 'skip' }
    case 'sender_block':
    case 'sender_allow':
      return { sender_ids: [] }
  }
}

// --- Config editors per rule type ---

function DedupConfigEditor({
  config, onChange,
}: {
  config: Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
      <select
        value={(config.method as string) || 'source_content_id'}
        onChange={(e) => onChange({ ...config, method: e.target.value })}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="source_content_id">Source Content ID</option>
        <option value="content_hash">Content Hash</option>
        <option value="both">Both</option>
      </select>
    </div>
  )
}

function KeywordBlockConfigEditor({
  config, onChange,
}: {
  config: Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}) {
  const keywords = (config.keywords as string[]) || []
  const [input, setInput] = useState('')

  const addKeyword = () => {
    const kw = input.trim()
    if (kw && !keywords.includes(kw)) {
      onChange({ ...config, keywords: [...keywords, kw] })
    }
    setInput('')
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            placeholder="Add keyword..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button type="button" onClick={addKeyword}
            className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
            Add
          </button>
        </div>
        {keywords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {keywords.map((kw) => (
              <span key={kw} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                {kw}
                <button type="button" onClick={() => onChange({ ...config, keywords: keywords.filter((k) => k !== kw) })}
                  className="text-gray-400 hover:text-red-500">&times;</button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={(config.case_sensitive as boolean) || false}
            onChange={(e) => onChange({ ...config, case_sensitive: e.target.checked })}
            className="rounded border-gray-300"
          />
          Case sensitive
        </label>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Action</label>
          <select
            value={(config.action as string) || 'skip'}
            onChange={(e) => onChange({ ...config, action: e.target.value })}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="skip">Skip</option>
            <option value="flag">Flag</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function FrequencyCapConfigEditor({
  config, onChange,
}: {
  config: Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
}) {
  return (
    <div className="flex gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Max occurrences</label>
        <input
          type="number" min={1}
          value={(config.max_occurrences as number) || 3}
          onChange={(e) => onChange({ ...config, max_occurrences: parseInt(e.target.value) || 1 })}
          className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Window (hours)</label>
        <input
          type="number" min={1}
          value={(config.window_hours as number) || 24}
          onChange={(e) => onChange({ ...config, window_hours: parseInt(e.target.value) || 1 })}
          className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
        <select
          value={(config.action as string) || 'skip'}
          onChange={(e) => onChange({ ...config, action: e.target.value })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="skip">Skip</option>
          <option value="flag">Flag</option>
        </select>
      </div>
    </div>
  )
}

function SenderBlockConfigEditor({
  config, onChange, knownSenders,
}: {
  config: Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
  knownSenders: KnownSender[]
}) {
  const senderIds = (config.sender_ids as string[]) || []
  const [search, setSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const senderMap = new Map(knownSenders.map((s) => [s.sender_id, s.sender_name]))
  const displayName = (id: string) => senderMap.get(id) || id

  const available = knownSenders.filter(
    (s) => !senderIds.includes(s.sender_id) &&
      (search === '' ||
        s.sender_name.toLowerCase().includes(search.toLowerCase()) ||
        s.sender_id.toLowerCase().includes(search.toLowerCase()))
  )

  const addSender = (id: string) => {
    if (id && !senderIds.includes(id)) {
      onChange({ ...config, sender_ids: [...senderIds, id] })
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Blocked Senders</label>

      {/* Selected senders */}
      {senderIds.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {senderIds.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-1 text-xs text-purple-800">
              <span className="font-medium">{displayName(id)}</span>
              {senderMap.has(id) && (
                <span className="text-purple-400 font-mono text-[10px]">({id.length > 20 ? id.slice(0, 20) + '…' : id})</span>
              )}
              <button type="button" onClick={() => onChange({ ...config, sender_ids: senderIds.filter((s) => s !== id) })}
                className="ml-0.5 text-purple-400 hover:text-red-500">&times;</button>
            </span>
          ))}
        </div>
      )}

      {/* Picker toggle */}
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
      >
        {showPicker ? 'Close picker' : '+ Add sender'}
      </button>

      {/* Sender picker */}
      {showPicker && (
        <div className="mt-2 rounded-md border border-gray-200 bg-white p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search senders..."
            className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {knownSenders.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No known senders yet. Ingest some content first.</p>
          ) : available.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">
              {search ? 'No matching senders.' : 'All known senders already added.'}
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {available.map((s) => (
                <button
                  key={s.sender_id}
                  type="button"
                  onClick={() => addSender(s.sender_id)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-gray-50 text-left"
                >
                  <span>
                    <span className="font-medium text-gray-900">{s.sender_name || 'Unknown'}</span>
                    <span className="ml-2 text-xs text-gray-400 font-mono">{s.sender_id.length > 30 ? s.sender_id.slice(0, 30) + '…' : s.sender_id}</span>
                  </span>
                  <span className="text-xs text-gray-400">+</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ConfigEditor({
  ruleType, config, onChange, knownSenders,
}: {
  ruleType: PipelineRuleType
  config: Record<string, unknown>
  onChange: (c: Record<string, unknown>) => void
  knownSenders: KnownSender[]
}) {
  switch (ruleType) {
    case 'dedup_strategy':
      return <DedupConfigEditor config={config} onChange={onChange} />
    case 'keyword_block':
      return <KeywordBlockConfigEditor config={config} onChange={onChange} />
    case 'frequency_cap':
      return <FrequencyCapConfigEditor config={config} onChange={onChange} />
    case 'sender_block':
    case 'sender_allow':
      return <SenderBlockConfigEditor config={config} onChange={onChange} knownSenders={knownSenders} />
  }
}

// --- Main page ---

export default function ContentPipelinePage() {
  const {
    rules, stats, sources, senders, testResult,
    isLoading, isSubmitting, error,
    listRules, createRule, updateRule, deleteRule, toggleRule,
    testRules, getStats, getSources, getSenders, clearError,
  } = useContentPipeline()

  const [tab, setTab] = useState<'rules' | 'test' | 'stats'>('rules')
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<ContentPipelineRule | null>(null)

  // Form state
  const [formType, setFormType] = useState<PipelineRuleType>('dedup_strategy')
  const [formName, setFormName] = useState('')
  const [formSource, setFormSource] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPriority, setFormPriority] = useState(10)
  const [formEnabled, setFormEnabled] = useState(true)
  const [formConfig, setFormConfig] = useState<Record<string, unknown>>(defaultConfig('dedup_strategy'))

  // Test state
  const [testSource, setTestSource] = useState('')
  const [testBody, setTestBody] = useState('')
  const [testContentId, setTestContentId] = useState('')

  useEffect(() => {
    listRules()
    getSources()
    getSenders()
  }, [listRules, getSources, getSenders])

  const resetForm = () => {
    setEditingRule(null)
    setFormType('dedup_strategy')
    setFormName('')
    setFormSource('')
    setFormDescription('')
    setFormPriority(10)
    setFormEnabled(true)
    setFormConfig(defaultConfig('dedup_strategy'))
    setShowForm(false)
  }

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (rule: ContentPipelineRule) => {
    setEditingRule(rule)
    setFormType(rule.rule_type)
    setFormName(rule.name)
    setFormSource(rule.source || '')
    setFormDescription(rule.description || '')
    setFormPriority(rule.priority)
    setFormEnabled(rule.enabled)
    setFormConfig(rule.config)
    setShowForm(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (editingRule) {
      const data: UpdatePipelineRuleRequest = {
        name: formName,
        source: formSource || null,
        description: formDescription || null,
        priority: formPriority,
        enabled: formEnabled,
        config: formConfig,
      }
      await updateRule(editingRule.rule_id, data)
    } else {
      const data: CreatePipelineRuleRequest = {
        rule_type: formType,
        name: formName,
        config: formConfig,
        source: formSource || null,
        description: formDescription,
        priority: formPriority,
        enabled: formEnabled,
      }
      await createRule(data)
    }
    resetForm()
  }

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Delete this rule?')) return
    await deleteRule(ruleId)
  }

  const handleTest = async (e: FormEvent) => {
    e.preventDefault()
    await testRules({
      source: testSource,
      body: testBody,
      ...(testContentId && { source_content_id: testContentId }),
    })
  }

  return (
    <div>
      <PageHeader title="Content Pipeline" subtitle="Manage ingestion rules, test content, and view stats" />

      <ErrorMessage error={error} onDismiss={clearError} />

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-gray-200">
        {([
          { key: 'rules', label: 'Rules' },
          { key: 'test', label: 'Test' },
          { key: 'stats', label: 'Stats' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); if (t.key === 'stats') getStats() }}
            className={`pb-2 text-sm font-medium border-b-2 ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* --- Rules tab --- */}
      {tab === 'rules' && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm text-gray-500">{rules.length} rule{rules.length !== 1 ? 's' : ''} configured</p>
            <button onClick={openCreate}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              New Rule
            </button>
          </div>

          {/* Rule form (create or edit) */}
          {showForm && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                {editingRule ? 'Edit Rule' : 'New Rule'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {!editingRule && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={formType}
                        onChange={(e) => {
                          const t = e.target.value as PipelineRuleType
                          setFormType(t)
                          setFormConfig(defaultConfig(t))
                        }}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        {RULE_TYPES.map((rt) => (
                          <option key={rt.value} value={rt.value}>{rt.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      required value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Block spam keywords"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source (optional)</label>
                    <select
                      value={formSource}
                      onChange={(e) => setFormSource(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">All sources</option>
                      {sources.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <input
                      type="number" min={0}
                      value={formPriority}
                      onChange={(e) => setFormPriority(parseInt(e.target.value) || 0)}
                      className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="What this rule does..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                  <h4 className="mb-3 text-sm font-medium text-gray-700">Configuration</h4>
                  <ConfigEditor ruleType={editingRule?.rule_type || formType} config={formConfig} onChange={setFormConfig} knownSenders={senders} />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox" checked={formEnabled}
                      onChange={(e) => setFormEnabled(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Enabled
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={resetForm}
                      className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                      {isSubmitting ? 'Saving...' : editingRule ? 'Update' : 'Create'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Rules list */}
          {isLoading ? (
            <LoadingSpinner />
          ) : rules.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
              No pipeline rules configured. Click &ldquo;New Rule&rdquo; to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.rule_id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${RULE_TYPE_COLORS[rule.rule_type]}`}>
                        {RULE_TYPES.find((rt) => rt.value === rule.rule_type)?.label || rule.rule_type}
                      </span>
                      <span className="font-medium text-gray-900">{rule.name}</span>
                      {rule.source && (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          {rule.source}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">priority: {rule.priority}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleRule(rule.rule_id)}
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          rule.enabled
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}>
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <button onClick={() => openEdit(rule)}
                        className="text-xs text-gray-500 hover:text-gray-700">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(rule.rule_id)}
                        className="text-xs text-red-500 hover:text-red-700">
                        Delete
                      </button>
                    </div>
                  </div>
                  {rule.description && (
                    <p className="mt-1 text-sm text-gray-500">{rule.description}</p>
                  )}
                  <div className="mt-2 text-xs text-gray-400 font-mono">
                    {JSON.stringify(rule.config)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- Test tab --- */}
      {tab === 'test' && (
        <div>
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Dry-Run Test</h3>
            <p className="mb-4 text-sm text-gray-500">
              Test how the pipeline would evaluate a message without actually ingesting it.
            </p>
            <form onSubmit={handleTest} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <select
                    required value={testSource}
                    onChange={(e) => setTestSource(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select source...</option>
                    {sources.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Content ID (optional)</label>
                  <input
                    value={testContentId}
                    onChange={(e) => setTestContentId(e.target.value)}
                    placeholder="e.g. wa:group@g.us:ABC123"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message Body</label>
                <textarea
                  required value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  rows={4}
                  placeholder="Paste a message to test against all enabled rules..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <button type="submit" disabled={isSubmitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {isSubmitting ? 'Testing...' : 'Run Test'}
              </button>
            </form>

            {testResult && (
              <div className={`mt-4 rounded-md p-4 ${
                testResult.would_ingest ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-semibold ${testResult.would_ingest ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.would_ingest ? 'Would be ingested' : 'Would be blocked'}
                  </span>
                </div>
                <p className={`text-sm ${testResult.would_ingest ? 'text-green-700' : 'text-red-700'}`}>
                  Reason: {testResult.reason}
                  {testResult.rule_name && ` (rule: ${testResult.rule_name})`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Stats tab --- */}
      {tab === 'stats' && (
        <div>
          {isLoading ? (
            <LoadingSpinner />
          ) : stats ? (
            <div className="space-y-6">
              {/* Total */}
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Total Ingested</h3>
                <p className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
              </div>

              {/* By source */}
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">By Source</h3>
                {Object.keys(stats.by_source).length === 0 ? (
                  <p className="text-sm text-gray-400">No data</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {Object.entries(stats.by_source).map(([source, count]) => (
                      <div key={source} className="rounded-md bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">{source}</p>
                        <p className="text-lg font-semibold text-gray-900">{count.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* By status */}
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">By Status</h3>
                {Object.keys(stats.by_status).length === 0 ? (
                  <p className="text-sm text-gray-400">No data</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {Object.entries(stats.by_status).map(([status, count]) => (
                      <div key={status} className="rounded-md bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">{status}</p>
                        <p className="text-lg font-semibold text-gray-900">{count.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
              No stats available. Click the Stats tab to load.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
