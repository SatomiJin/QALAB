import { ExerciseTotalsDto, SkillProgressDto } from './dto/dashboard.dto.js';
import { percentOf, type SkillProgressRow, skillStatus } from './stats.js';

// Row → DTO mapping shared by the dashboard and the admin user page.

export function exerciseTotals(row: SkillProgressRow): ExerciseTotalsDto {
  return {
    total: row.total_exercises,
    attempted: row.attempted_exercises,
    passed: row.passed_exercises,
    averageScore: row.average_score,
  };
}

export function toSkillProgress(row: SkillProgressRow): SkillProgressDto {
  return {
    code: row.skill_code,
    name: row.skill_name,
    totalLessons: row.total_lessons,
    completedLessons: row.completed_lessons,
    percent: percentOf(row.completed_lessons, row.total_lessons),
    status: skillStatus(row),
    exercises: exerciseTotals(row),
  };
}
