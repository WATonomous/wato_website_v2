import { ChangeEventHandler } from "react";

interface FormDropdownProps {
    id: string;
    title: string;
    span?: boolean;
    options: string[];
    placeholder?: string;
    formData: Record<string, unknown>;
    onFormChange: ChangeEventHandler;
}

const FormDropdown = ({
    id,
    title,
    span,
    options,
    placeholder,
    formData,
    onFormChange,
}: FormDropdownProps) => {
    return (
        <div className={`col-span-1 ${span && "lg:col-span-2"}`}>
            <div>
                <label htmlFor={id} className="text-sm font-medium">
                    {title}
                </label>
                <span className="text-red-400"> *</span>
            </div>
            <select
                className="mt-2 w-full rounded-md bg-wato-white-bone p-1 text-base text-wato-black"
                onChange={onFormChange}
                name={id}
                value={(formData[id] as string) || (placeholder ? "" : options[0])}
                required
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((o) => {
                    return (
                        <option value={o} key={o}>
                            {o}
                        </option>
                    );
                })}
            </select>
        </div>
    );
};

export default FormDropdown;
