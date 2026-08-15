//phoneNumber validator
export function isValidPhone(phone){
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

//email validator
export function isValidEmail(email){
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export function isValidPassword(password){
  // Minimum 6 characters, 1 letter, 1number
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;
  return passwordRegex.test(password);
};