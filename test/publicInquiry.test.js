import {describe,it,expect} from 'vitest'
import {validateInquiry} from '../content/marketing/inquiryValidation'
const values={full_name:'Synthetic Applicant',email:'user@example.test',company_name:'Synthetic Company',message:'We need clearer production dates.',consent:true,applicant_type:'supplier',country_region:'Canada',intended_data_category:'Ordinary non-controlled data',data_restrictions_acknowledged:true}
describe('Public inquiry validation',()=>{
  it('accepts the short demo request without application-only fields',()=>expect(validateInquiry({...values,applicant_type:'',country_region:'',intended_data_category:'',data_restrictions_acknowledged:false},false)).toEqual({}))
  it('accepts a complete supplier application',()=>expect(validateInquiry(values,true)).toEqual({}))
  it('requires separate data acknowledgment and contact permission',()=>expect(Object.keys(validateInquiry({...values,consent:false,data_restrictions_acknowledged:false},true))).toEqual(['consent','data_restrictions_acknowledged']))
  it('rejects incomplete or unsupported categories',()=>expect(Object.keys(validateInquiry({...values,email:'invalid',applicant_type:'admin',message:'short'},true))).toEqual(['email','message','applicant_type']))
})
