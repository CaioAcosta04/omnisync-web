import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'
import './AuthForm.css'

export interface AuthFormField {
    icon: ReactNode
    name: string
    label: string
    type: string
    inputDescription: string
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: string
    title?: string
    autoComplete?: InputHTMLAttributes<HTMLInputElement>['autoComplete']
    validationMessage?: string
}

interface AuthFormProps {
    title: string
    text: string
    fields: AuthFormField[]
    submitLabel: string
    onSubmit: (data: Record<string, string>) => void
    onValidationError?: (message: string) => void
    errorMessage?: string
    initialValues?: Record<string, string>
    onValuesChange?: (data: Record<string, string>) => void
    children?: ReactNode
    passwordLabelEnd?: ReactNode
    submitDisabled?: boolean
}

interface PasswordFieldProps {
    field: AuthFormField
    labelEnd?: ReactNode
    initialValues?: Record<string, string>
    onValuesChange?: (data: Record<string, string>) => void
}

function PasswordField({ field, labelEnd, initialValues, onValuesChange }: PasswordFieldProps) {
    const [visible, setVisible] = useState(false)

    return (
        <div className="field-row">
            {labelEnd ? (
                <div className="field-label-row">
                    <p className="field-desc">{field.inputDescription}</p>
                    {labelEnd}
                </div>
            ) : (
                <p className="field-desc">{field.inputDescription}</p>
            )}
            <label className="auth-field" htmlFor={field.name}>
                <span className="auth-field-icon">{field.icon}</span>
                <input
                    id={field.name}
                    name={field.name}
                    type={visible ? 'text' : 'password'}
                    placeholder={field.label}
                    required={field.required ?? true}
                    minLength={field.minLength}
                    maxLength={field.maxLength}
                    pattern={field.pattern}
                    title={field.title}
                    autoComplete={field.autoComplete}
                    defaultValue={initialValues?.[field.name] ?? ''}
                    onChange={(event) => {
                        const form = event.currentTarget.form
                        if (!form || !onValuesChange) {
                            return
                        }
                        const formData = new FormData(form)
                        const data = Object.fromEntries(formData) as Record<string, string>
                        onValuesChange(data)
                    }}
                />
                <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setVisible(prev => !prev)}
                    tabIndex={-1}
                >
                    {visible ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                </button>
            </label>
        </div>
    )
}

export function AuthForm({
    title,
    text,
    fields,
    submitLabel,
    onSubmit,
    onValidationError,
    errorMessage,
    initialValues,
    onValuesChange,
    children,
    passwordLabelEnd,
    submitDisabled = false,
}: AuthFormProps) {
    function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()

        for (const field of fields) {
            const input = event.currentTarget.elements.namedItem(field.name) as HTMLInputElement | null
            if (!input) {
                continue
            }

            input.setCustomValidity('')
            if (!input.checkValidity()) {
                if (field.validationMessage) {
                    input.setCustomValidity(field.validationMessage)
                }
                onValidationError?.(field.validationMessage ?? input.validationMessage)
                return
            }
        }

        onValidationError?.('')
        const formData = new FormData(event.currentTarget)
        const data = Object.fromEntries(formData) as Record<string, string>
        onSubmit(data)
    }

    return (
        <form className="form" onSubmit={handleSubmit} noValidate>
            <h1>{title}</h1>
            <p>{text}</p>
            {fields.map(field =>
                field.type === 'password' ? (
                    <PasswordField
                        key={field.name}
                        field={field}
                        labelEnd={passwordLabelEnd}
                        initialValues={initialValues}
                        onValuesChange={onValuesChange}
                    />
                ) : (
                    <div key={field.name} className="field-row">
                        <p className="field-desc">{field.inputDescription}</p>
                        <label className="auth-field" htmlFor={field.name}>
                            <span className="auth-field-icon">{field.icon}</span>
                            <input
                                id={field.name}
                                name={field.name}
                                type={field.type}
                                placeholder={field.label}
                                required={field.required ?? true}
                                minLength={field.minLength}
                                maxLength={field.maxLength}
                                pattern={field.pattern}
                                title={field.title}
                                autoComplete={field.autoComplete}
                                defaultValue={initialValues?.[field.name] ?? ''}
                                onChange={(event) => {
                                    const form = event.currentTarget.form
                                    if (!form || !onValuesChange) {
                                        return
                                    }
                                    const formData = new FormData(form)
                                    const data = Object.fromEntries(formData) as Record<string, string>
                                    onValuesChange(data)
                                }}
                            />
                        </label>
                    </div>
                )
            )}
            {errorMessage ? <p className="auth-form-error">{errorMessage}</p> : null}
            <div className="form-footer">
                {children}
                <button type="submit" className="submit-button" disabled={submitDisabled}>{submitLabel}</button>
            </div>
        </form>
    )
}