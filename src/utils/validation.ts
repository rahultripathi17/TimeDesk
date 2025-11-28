export const REGEX = {
    PHONE: /^\d{10}$/,
    PINCODE: /^\d{6}$/,
    AADHAAR: /^\d{12}$/,
    PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
};

export const validatePhone = (phone: string) => {
    if (!phone) return "Phone number is required";
    if (!REGEX.PHONE.test(phone)) return "Phone number must be exactly 10 digits";
    return null;
};

export const validatePincode = (pincode: string) => {
    if (!pincode) return "Pincode is required";
    if (!REGEX.PINCODE.test(pincode)) return "Pincode must be exactly 6 digits";
    return null;
};

export const validateAadhaar = (aadhaar: string) => {
    if (!aadhaar) return null; // Optional
    if (!REGEX.AADHAAR.test(aadhaar)) return "Aadhaar number must be exactly 12 digits";
    return null;
};

export const validatePAN = (pan: string) => {
    if (!pan) return null; // Optional
    if (!REGEX.PAN.test(pan)) return "Invalid PAN number format (e.g., ABCDE1234F)";
    return null;
};

export const validateRequired = (value: string, fieldName: string) => {
    if (!value || value.trim() === "") return `${fieldName} is required`;
    return null;
};
