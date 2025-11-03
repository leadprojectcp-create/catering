export interface ValidationError {
  field: string
  message: string
}

/**
 * 유효성 검사 유틸리티
 */
export class Validator {
  /**
   * 이메일 형식 검증
   */
  static validateEmail(email: string): ValidationError | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!email || !email.trim()) {
      return { field: 'email', message: '이메일을 입력해주세요.' }
    }

    if (!emailRegex.test(email)) {
      return { field: 'email', message: '올바른 이메일 형식이 아닙니다.' }
    }

    return null
  }

  /**
   * 전화번호 검증
   */
  static validatePhone(phone: string): ValidationError | null {
    if (!phone || !phone.trim()) {
      return { field: 'phone', message: '연락처를 입력해주세요.' }
    }

    return null
  }

  /**
   * 주소 검증
   */
  static validateAddress(address: string, required: boolean = true): ValidationError | null {
    if (required && (!address || !address.trim())) {
      return { field: 'address', message: '주소를 입력해주세요.' }
    }

    return null
  }

  /**
   * 이름 검증
   */
  static validateName(name: string, fieldName: string = '이름'): ValidationError | null {
    if (!name || !name.trim()) {
      return { field: 'name', message: `${fieldName}을(를) 입력해주세요.` }
    }

    return null
  }

  /**
   * 날짜 검증
   */
  static validateDate(date: string, fieldName: string = '날짜'): ValidationError | null {
    if (!date) {
      return { field: 'date', message: `${fieldName}을(를) 선택해주세요.` }
    }

    return null
  }

  /**
   * 약관 동의 검증
   */
  static validateAgreements(agreements: {
    privacy: boolean
    terms: boolean
    refund: boolean
    marketing: boolean
  }): ValidationError | null {
    if (!agreements.privacy || !agreements.terms || !agreements.refund || !agreements.marketing) {
      return { field: 'agreements', message: '필수 약관에 모두 동의해주세요.' }
    }

    return null
  }

  /**
   * 주문 정보 전체 검증
   */
  static validateOrderInfo(params: {
    orderer: string
    phone: string
    email: string
    recipient: string
    deliveryDate: string
    deliveryTime?: string
    address?: string
    deliveryMethod: string
  }): ValidationError[] {
    const errors: ValidationError[] = []

    // 주문자 이름
    const ordererError = this.validateName(params.orderer, '주문자 이름')
    if (ordererError) errors.push(ordererError)

    // 전화번호
    const phoneError = this.validatePhone(params.phone)
    if (phoneError) errors.push(phoneError)

    // 이메일
    const emailError = this.validateEmail(params.email)
    if (emailError) errors.push(emailError)

    // 수령인
    const recipientError = this.validateName(params.recipient, '수령인 이름')
    if (recipientError) errors.push(recipientError)

    // 배송 날짜
    const dateError = this.validateDate(params.deliveryDate, '배송 날짜')
    if (dateError) errors.push(dateError)

    // 배송 시간 (택배가 아닐 때만)
    if (params.deliveryMethod !== '택배 배송' && params.deliveryTime !== undefined) {
      const timeError = this.validateDate(params.deliveryTime, '배송 시간')
      if (timeError) errors.push(timeError)
    }

    // 주소 (퀵업체 배송일 때만)
    if (params.deliveryMethod === '퀵업체 배송' && params.address !== undefined) {
      const addressError = this.validateAddress(params.address)
      if (addressError) errors.push(addressError)
    }

    return errors
  }
}
