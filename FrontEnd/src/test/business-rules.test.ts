import {describe,it,expect} from 'vitest';
import {calculateFee,attendanceRate} from '@/frontend/rules';
describe('Financial and attendance rules',()=>{
 it('exempts full scholarship and applies partial discount',()=>{expect(calculateFee(150,'full',0)).toBe(0);expect(calculateFee(150,'partial',20)).toBe(120);expect(calculateFee(150,'none',0)).toBe(150)});
 it('rejects invalid amounts',()=>{expect(()=>calculateFee(-1,'none',0)).toThrow()});
 it('excludes nonparticipants from attendance denominator',()=>{expect(attendanceRate(['present','absent','excluded'])).toBe(50);expect(attendanceRate([])).toBe(0)})
});
