import { Form } from "components/ResumeForm/Form";
import {
  BulletListTextarea,
  InputGroupWrapper,
} from "components/ResumeForm/Form/InputGroup";
import { FeaturedSkillInput } from "components/ResumeForm/Form/FeaturedSkillInput";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { selectSkills, changeSkills } from "lib/redux/resumeSlice";
import {
  selectShowBulletPoints,
  changeShowBulletPoints,
  selectThemeColor,
} from "lib/redux/settingsSlice";

export const SkillsForm = () => {
  const skills = useAppSelector(selectSkills);
  const dispatch = useAppDispatch();
  const { featuredSkills, descriptions } = skills;
  const form = "skills";
  const showBulletPoints = useAppSelector(selectShowBulletPoints(form));
  const themeColor = useAppSelector(selectThemeColor) || "#38bdf8";

  const handleSkillsChange = (field: "descriptions", value: string[]) => {
    dispatch(changeSkills({ field, value }));
  };
  const handleFeaturedSkillsChange = (
    idx: number,
    skill: string,
    rating: number
  ) => {
    dispatch(changeSkills({ field: "featuredSkills", idx, skill, rating }));
  };
  const handleShowBulletPoints = (value: boolean) => {
    dispatch(changeShowBulletPoints({ field: form, value }));
  };

  return (
    <Form form={form}>
      <div className="col-span-full grid grid-cols-6 gap-y-4 gap-x-4">
        <BulletListTextarea
          label="Skills List"
          labelClassName="col-span-full"
          name="descriptions"
          placeholder="Bullet points"
          value={descriptions}
          onChange={handleSkillsChange}
          showBulletPoints={showBulletPoints}
          onBulletToggle={handleShowBulletPoints}
        />
        <div className="col-span-full mb-4 mt-6 border-t-2 border-dotted border-gray-200" />
        <InputGroupWrapper
          label="Featured Skills (Optional)"
          className="col-span-full"
        >
          <p className="mt-2 text-sm font-normal text-gray-600">
            Featured skills is optional to highlight top skills, with more
            circles mean higher proficiency.
          </p>
        </InputGroupWrapper>

        {featuredSkills.map(({ skill, rating }, idx) => (
          <FeaturedSkillInput
            key={idx}
            className="col-span-full"
            skill={skill}
            rating={rating}
            setSkillRating={(newSkill, newRating) => {
              handleFeaturedSkillsChange(idx, newSkill, newRating);
            }}
            placeholder={`Featured Skill ${idx + 1}`}
            circleColor={themeColor}
          />
        ))}
      </div>
    </Form>
  );
};
