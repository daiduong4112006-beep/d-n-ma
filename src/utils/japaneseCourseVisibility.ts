import {JapaneseCourse} from '../types/japanese';
export function isJpd123Course(course:Pick<JapaneseCourse,'id'|'code'>){return course.id==='course-jpd123'||(course.code||'').toLowerCase().replace(/\s+/g,'')==='jpd123';}
export function visibleJapaneseCourses(courses:JapaneseCourse[],hasJpdAccess:boolean){return courses.filter(c=>hasJpdAccess||!isJpd123Course(c));}
