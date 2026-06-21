import { db } from "../index";
import { exerciseLibrary } from "../schema";

const exercises = [
  // Chest
  { name: "Bench Press",               slug: "bench-press",               muscleGroups: ["chest","triceps","shoulders"], equipment: "barbell",    isCompound: true  },
  { name: "Incline Bench Press",        slug: "incline-bench-press",        muscleGroups: ["chest","triceps","shoulders"], equipment: "barbell",    isCompound: true  },
  { name: "Dumbbell Press",             slug: "dumbbell-press",             muscleGroups: ["chest","triceps","shoulders"], equipment: "dumbbell",   isCompound: true  },
  { name: "Incline Fly",                slug: "incline-fly",                muscleGroups: ["chest"],                       equipment: "dumbbell",   isCompound: false },
  { name: "Cable Crossover",            slug: "cable-crossover",            muscleGroups: ["chest"],                       equipment: "cable",      isCompound: false },
  { name: "Dip",                        slug: "dip",                        muscleGroups: ["chest","triceps"],             equipment: "bodyweight", isCompound: true  },
  { name: "Push-up",                    slug: "push-up",                    muscleGroups: ["chest","triceps","shoulders"], equipment: "bodyweight", isCompound: true  },
  // Back
  { name: "Barbell Row",                slug: "barbell-row",                muscleGroups: ["back","biceps"],               equipment: "barbell",    isCompound: true  },
  { name: "Deadlift",                   slug: "deadlift",                   muscleGroups: ["back","hamstrings","glutes"],  equipment: "barbell",    isCompound: true  },
  { name: "Romanian Deadlift",          slug: "romanian-deadlift",          muscleGroups: ["hamstrings","glutes","back"],  equipment: "barbell",    isCompound: true  },
  { name: "Pull-up",                    slug: "pull-up",                    muscleGroups: ["back","biceps"],               equipment: "bodyweight", isCompound: true  },
  { name: "Lat Pulldown",               slug: "lat-pulldown",               muscleGroups: ["back","biceps"],               equipment: "cable",      isCompound: true  },
  { name: "Seated Cable Row",           slug: "seated-cable-row",           muscleGroups: ["back","biceps"],               equipment: "cable",      isCompound: true  },
  { name: "T-Bar Row",                  slug: "t-bar-row",                  muscleGroups: ["back","biceps"],               equipment: "barbell",    isCompound: true  },
  { name: "Dumbbell Row",               slug: "dumbbell-row",               muscleGroups: ["back","biceps"],               equipment: "dumbbell",   isCompound: true  },
  { name: "Face Pull",                  slug: "face-pull",                  muscleGroups: ["back","shoulders"],            equipment: "cable",      isCompound: false },
  // Legs
  { name: "Squat",                      slug: "squat",                      muscleGroups: ["quads","glutes","hamstrings"], equipment: "barbell",    isCompound: true  },
  { name: "Front Squat",                slug: "front-squat",                muscleGroups: ["quads","glutes"],              equipment: "barbell",    isCompound: true  },
  { name: "Leg Press",                  slug: "leg-press",                  muscleGroups: ["quads","glutes"],              equipment: "machine",    isCompound: true  },
  { name: "Lunges",                     slug: "lunges",                     muscleGroups: ["quads","glutes","hamstrings"], equipment: "dumbbell",   isCompound: true  },
  { name: "Leg Curl",                   slug: "leg-curl",                   muscleGroups: ["hamstrings"],                  equipment: "machine",    isCompound: false },
  { name: "Leg Extension",              slug: "leg-extension",              muscleGroups: ["quads"],                       equipment: "machine",    isCompound: false },
  { name: "Calf Raise",                 slug: "calf-raise",                 muscleGroups: ["calves"],                      equipment: "machine",    isCompound: false },
  { name: "Hip Thrust",                 slug: "hip-thrust",                 muscleGroups: ["glutes","hamstrings"],         equipment: "barbell",    isCompound: true  },
  { name: "Bulgarian Split Squat",      slug: "bulgarian-split-squat",      muscleGroups: ["quads","glutes"],              equipment: "dumbbell",   isCompound: true  },
  // Shoulders
  { name: "Overhead Press",             slug: "overhead-press",             muscleGroups: ["shoulders","triceps"],         equipment: "barbell",    isCompound: true  },
  { name: "Dumbbell Shoulder Press",    slug: "dumbbell-shoulder-press",    muscleGroups: ["shoulders","triceps"],         equipment: "dumbbell",   isCompound: true  },
  { name: "Lateral Raise",              slug: "lateral-raise",              muscleGroups: ["shoulders"],                   equipment: "dumbbell",   isCompound: false },
  { name: "Rear Delt Fly",              slug: "rear-delt-fly",              muscleGroups: ["shoulders","back"],            equipment: "dumbbell",   isCompound: false },
  { name: "Arnold Press",               slug: "arnold-press",               muscleGroups: ["shoulders","triceps"],         equipment: "dumbbell",   isCompound: false },
  // Biceps
  { name: "Barbell Curl",               slug: "barbell-curl",               muscleGroups: ["biceps"],                      equipment: "barbell",    isCompound: false },
  { name: "Dumbbell Curl",              slug: "dumbbell-curl",              muscleGroups: ["biceps"],                      equipment: "dumbbell",   isCompound: false },
  { name: "Hammer Curl",                slug: "hammer-curl",                muscleGroups: ["biceps"],                      equipment: "dumbbell",   isCompound: false },
  { name: "Preacher Curl",              slug: "preacher-curl",              muscleGroups: ["biceps"],                      equipment: "barbell",    isCompound: false },
  { name: "Cable Curl",                 slug: "cable-curl",                 muscleGroups: ["biceps"],                      equipment: "cable",      isCompound: false },
  // Triceps
  { name: "Tricep Pushdown",            slug: "tricep-pushdown",            muscleGroups: ["triceps"],                     equipment: "cable",      isCompound: false },
  { name: "Skull Crusher",              slug: "skull-crusher",              muscleGroups: ["triceps"],                     equipment: "barbell",    isCompound: false },
  { name: "Overhead Tricep Extension",  slug: "overhead-tricep-extension",  muscleGroups: ["triceps"],                     equipment: "dumbbell",   isCompound: false },
  { name: "Close Grip Bench Press",     slug: "close-grip-bench-press",     muscleGroups: ["triceps","chest"],             equipment: "barbell",    isCompound: true  },
  // Core
  { name: "Plank",                      slug: "plank",                      muscleGroups: ["core"],                        equipment: "bodyweight", isCompound: false },
  { name: "Hanging Leg Raise",          slug: "hanging-leg-raise",          muscleGroups: ["core"],                        equipment: "bodyweight", isCompound: false },
  { name: "Cable Crunch",               slug: "cable-crunch",               muscleGroups: ["core"],                        equipment: "cable",      isCompound: false },
  { name: "Russian Twist",              slug: "russian-twist",              muscleGroups: ["core"],                        equipment: "bodyweight", isCompound: false },
  { name: "Ab Wheel Rollout",           slug: "ab-wheel-rollout",           muscleGroups: ["core"],                        equipment: "bodyweight", isCompound: false },
  // Cardio
  { name: "Treadmill Run",              slug: "treadmill-run",              muscleGroups: ["cardio"],                      equipment: "machine",    isCompound: false },
  { name: "Rowing Erg",                 slug: "rowing-erg",                 muscleGroups: ["cardio","back"],               equipment: "machine",    isCompound: false },
  { name: "Stationary Bike",            slug: "stationary-bike",            muscleGroups: ["cardio"],                      equipment: "machine",    isCompound: false },
  { name: "Jump Rope",                  slug: "jump-rope",                  muscleGroups: ["cardio"],                      equipment: "bodyweight", isCompound: false },
];

async function seed() {
  console.log(`Seeding ${exercises.length} exercises...`);
  await db
    .insert(exerciseLibrary)
    .values(exercises.map(e => ({ ...e, isCustom: false })))
    .onConflictDoNothing(); // idempotent — safe to re-run
  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
