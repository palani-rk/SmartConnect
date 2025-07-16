/**
 * Generate a secure password with mixed character sets
 * @returns A 12-character password with at least one uppercase, lowercase, number, and symbol
 */
export function generateSecurePassword(): string {
  // Character sets for password generation
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  const allChars = uppercase + lowercase + numbers + symbols
  
  let password = ''
  
  // Ensure at least one character from each set
  password += getRandomChar(uppercase)
  password += getRandomChar(lowercase)
  password += getRandomChar(numbers)
  password += getRandomChar(symbols)
  
  // Fill remaining 8 characters randomly
  for (let i = 4; i < 12; i++) {
    password += getRandomChar(allChars)
  }
  
  // Shuffle the password to randomize character positions
  const passwordArray = password.split('')
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]]
  }
  
  return passwordArray.join('')
}

function getRandomChar(charset: string): string {
  return charset.charAt(Math.floor(Math.random() * charset.length))
}