import type { ReactNode } from 'react'
import {
  getAttributeUiHint,
  getNumberUnitFallbackHint,
  isNumberUnitField,
  type MlAttributeFieldState,
} from '../lib/mlCategoryAttributes'
import {
  GTIN_FIELD_HINT,
  isEmptyGtinReasonAttributeId,
  isGtinAttributeId,
  normalizeGtinInput,
} from '../lib/mlProductIdentifier'
import type { MlAttributeDefinition, MlAttributeUnitOption, MlAttributeValueOption } from '../types/mercadolivreCatalog'

type MlCategoryAttributesFormProps = {
  fields: MlAttributeDefinition[]
  values: MlAttributeFieldState
  errors: Record<string, string>
  onChange: (next: MlAttributeFieldState) => void
  onFieldBlur?: (fieldId: string) => void
}

export function MlCategoryAttributesForm({
  fields,
  values,
  errors,
  onChange,
  onFieldBlur,
}: MlCategoryAttributesFormProps) {
  if (fields.length === 0) return null

  const gtinField = fields.find((f) => isGtinAttributeId(f.id))
  const emptyReasonField = fields.find((f) => isEmptyGtinReasonAttributeId(f.id))
  const otherFields = fields.filter(
    (f) => !isGtinAttributeId(f.id) && !isEmptyGtinReasonAttributeId(f.id)
  )

  const noGtinMode = values.__NO_GTIN__ === 'true'

  const setField = (key: string, value: string) => {
    onChange({ ...values, [key]: value })
  }

  const toggleNoGtin = (checked: boolean) => {
    if (checked) {
      onChange({
        ...values,
        __NO_GTIN__: 'true',
        ...(gtinField ? { [gtinField.id]: '' } : {}),
      })
    } else {
      onChange({
        ...values,
        __NO_GTIN__: '',
        ...(emptyReasonField ? { [emptyReasonField.id]: '' } : {}),
      })
    }
  }

  return (
    <div style={styles.wrap}>
      <p style={styles.sectionTitle}>Atributos obrigatórios da categoria</p>
      <div style={styles.fields}>
        {gtinField ? (
          <GtinAttributeField
            field={gtinField}
            value={values[gtinField.id] ?? ''}
            error={errors[gtinField.id]}
            disabled={noGtinMode}
            showNoBarcodeOption={emptyReasonField != null}
            noGtinMode={noGtinMode}
            onToggleNoGtin={toggleNoGtin}
            onChange={(v) => setField(gtinField.id, v)}
            onBlur={() => onFieldBlur?.(gtinField.id)}
          />
        ) : null}

        {noGtinMode && emptyReasonField ? (
          <AttributeField
            field={emptyReasonField}
            values={values}
            error={errors[emptyReasonField.id]}
            onChange={setField}
            onBlur={() => onFieldBlur?.(emptyReasonField.id)}
          />
        ) : null}

        {otherFields.map((field) => (
          <AttributeField
            key={field.id}
            field={field}
            values={values}
            error={errors[field.id]}
            onChange={setField}
            onBlur={() => onFieldBlur?.(field.id)}
          />
        ))}
      </div>
    </div>
  )
}

function GtinAttributeField({
  field,
  value,
  error,
  disabled,
  showNoBarcodeOption,
  noGtinMode,
  onToggleNoGtin,
  onChange,
  onBlur,
}: {
  field: MlAttributeDefinition
  value: string
  error?: string
  disabled: boolean
  showNoBarcodeOption: boolean
  noGtinMode: boolean
  onToggleNoGtin: (checked: boolean) => void
  onChange: (value: string) => void
  onBlur: () => void
}) {
  const label = field.name || 'GTIN'
  const hint = getAttributeUiHint(field) ?? GTIN_FIELD_HINT

  return (
    <div style={styles.field}>
      <label style={styles.label} htmlFor={`ml-attr-${field.id}`}>
        {label}
        {!noGtinMode ? <span style={styles.required}> *</span> : null}
      </label>
      <span style={styles.hint}>{hint}</span>
      <input
        id={`ml-attr-${field.id}`}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="Ex.: 7891234567890"
        maxLength={14}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(normalizeGtinInput(e.target.value))}
        onBlur={onBlur}
        style={{
          ...styles.input,
          ...(error ? styles.inputError : {}),
          ...(disabled ? styles.inputDisabled : {}),
        }}
      />
      {showNoBarcodeOption ? (
        <label style={styles.checkRow}>
          <input
            type="checkbox"
            checked={noGtinMode}
            onChange={(e) => onToggleNoGtin(e.target.checked)}
          />
          <span>Não possuo código de barras (GTIN)</span>
        </label>
      ) : null}
      {error ? <span style={styles.errorMsg}>{error}</span> : null}
    </div>
  )
}

function AttributeField({
  field,
  values,
  error,
  onChange,
  onBlur,
}: {
  field: MlAttributeDefinition
  values: MlAttributeFieldState
  error?: string
  onChange: (key: string, value: string) => void
  onBlur: () => void
}) {
  const valueType = field.value_type ?? 'string'
  const label = field.name || field.id
  const hint = getAttributeUiHint(field)

  if (isNumberUnitField(field)) {
    const hasUnitOptions = field.allowed_units != null && field.allowed_units.length > 0
    if (hasUnitOptions) {
      const numKey = `${field.id}__number`
      const unitKey = `${field.id}__unit`
      return (
        <FieldShell label={label} required hint={hint} error={error}>
          <div style={styles.numberUnitRow}>
            <input
              id={`ml-attr-${field.id}`}
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={values[numKey] ?? ''}
              onChange={(e) => onChange(numKey, e.target.value)}
              onBlur={onBlur}
              style={{ ...styles.input, flex: 1, ...(error ? styles.inputError : {}) }}
            />
            <select
              value={values[unitKey] ?? field.allowed_units![0]?.id ?? ''}
              onChange={(e) => onChange(unitKey, e.target.value)}
              style={{ ...styles.input, width: 'auto', minWidth: '80px' }}
            >
              {field.allowed_units!.map((unit: MlAttributeUnitOption) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
        </FieldShell>
      )
    }

    return (
      <FieldShell
        label={label}
        required
        hint={getNumberUnitFallbackHint(field)}
        error={error}
        htmlFor={`ml-attr-${field.id}`}
      >
        <input
          id={`ml-attr-${field.id}`}
          type="text"
          placeholder="Ex: 3 L"
          value={values[field.id] ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          onBlur={onBlur}
          style={{ ...styles.input, ...(error ? styles.inputError : {}) }}
        />
      </FieldShell>
    )
  }

  if (valueType === 'list' && field.values && field.values.length > 0) {
    return (
      <FieldShell label={label} required hint={hint} error={error} htmlFor={`ml-attr-${field.id}`}>
        <select
          id={`ml-attr-${field.id}`}
          value={values[field.id] ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          onBlur={onBlur}
          style={{ ...styles.input, ...(error ? styles.inputError : {}) }}
        >
          <option value="">Selecione…</option>
          {field.values.map((opt: MlAttributeValueOption) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      </FieldShell>
    )
  }

  if (valueType === 'boolean') {
    return (
      <FieldShell label={label} required hint={hint} error={error}>
        <div style={styles.toggleRow}>
          {[
            { value: 'Sim', label: 'Sim' },
            { value: 'Não', label: 'Não' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              style={{
                ...styles.toggleBtn,
                ...(values[field.id] === opt.value ? styles.toggleBtnActive : {}),
              }}
              onClick={() => onChange(field.id, opt.value)}
              onBlur={onBlur}
              aria-pressed={values[field.id] === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </FieldShell>
    )
  }

  if (valueType === 'number') {
    return (
      <FieldShell
        label={label}
        required
        hint={hint ?? 'Informe apenas o número (ex: 500).'}
        error={error}
        htmlFor={`ml-attr-${field.id}`}
      >
        <input
          id={`ml-attr-${field.id}`}
          type="text"
          inputMode="decimal"
          placeholder="Ex: 500"
          value={values[field.id] ?? ''}
          onChange={(e) => onChange(field.id, e.target.value)}
          onBlur={onBlur}
          style={{ ...styles.input, ...(error ? styles.inputError : {}) }}
        />
      </FieldShell>
    )
  }

  return (
    <FieldShell label={label} required hint={hint} error={error} htmlFor={`ml-attr-${field.id}`}>
      <input
        id={`ml-attr-${field.id}`}
        type="text"
        placeholder={`Informe ${label.toLowerCase()}`}
        value={values[field.id] ?? ''}
        onChange={(e) => onChange(field.id, e.target.value)}
        onBlur={onBlur}
        style={{ ...styles.input, ...(error ? styles.inputError : {}) }}
      />
    </FieldShell>
  )
}

function FieldShell({
  label,
  required,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div style={styles.field}>
      <label style={styles.label} htmlFor={htmlFor}>
        {label}
        {required ? <span style={styles.required}> *</span> : null}
      </label>
      {hint ? <span style={styles.hint}>{hint}</span> : null}
      {children}
      {error ? <span style={styles.errorMsg}>{error}</span> : null}
    </div>
  )
}

const styles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '13px',
    fontWeight: 600,
    color: '#78350f',
  },
  fields: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
  },
  required: {
    color: '#dc2626',
  },
  hint: {
    fontSize: '11px',
    color: '#9ca3af',
    lineHeight: 1.4,
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#4b5563',
    marginTop: '4px',
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontFamily: 'inherit',
    fontSize: '14px',
    color: '#111827',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box' as const,
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  inputError: {
    borderColor: '#fca5a5',
  },
  errorMsg: {
    fontSize: '12px',
    color: '#dc2626',
    fontWeight: 500,
  },
  toggleRow: {
    display: 'flex',
    gap: '8px',
  },
  toggleBtn: {
    padding: '8px 18px',
    borderRadius: '8px',
    border: '1.5px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
  },
  toggleBtnActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    color: '#92400e',
    fontWeight: 600,
  },
  numberUnitRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
} as const
