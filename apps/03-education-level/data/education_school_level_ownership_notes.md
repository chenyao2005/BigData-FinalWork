# Education School Classification Notes

- Output file: `education_school_level_ownership_full.csv`
- Total points: 1912 (K12=1842, colleges=70)

## Rules

1. K12 (`schools_2020_points`) level is mapped from `category`.
2. K12 ownership is set to `public_nyc_doe` (DOE public school location datasets).
3. Colleges (`colleges_points`) level is `university`.
4. College ownership is mapped from IPEDS `control`: 1=public, 2=private_nonprofit, 3=private_forprofit.

## Counts by level
- elementary: 734
- high: 421
- middle: 282
- k8: 216
- middle_high: 105
- university: 70
- k12: 66
- preschool: 15
- ungraded: 3

## Counts by ownership
- public_nyc_doe: 1842
- private_nonprofit: 40
- private_forprofit: 21
- public: 9
