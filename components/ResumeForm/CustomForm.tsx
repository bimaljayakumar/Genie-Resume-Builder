import { Form } from "components/ResumeForm/Form";
import { BulletListTextarea } from "components/ResumeForm/Form/InputGroup";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { changeCustom, selectCustom } from "lib/redux/resumeSlice";
import {
  selectShowBulletPoints,
  changeShowBulletPoints,
} from "lib/redux/settingsSlice";

export const CustomForm = () => {
  const custom = useAppSelector(selectCustom);
  const dispatch = useAppDispatch();
  const { descriptions } = custom;
  const form = "custom";
  const showBulletPoints = useAppSelector(selectShowBulletPoints(form));

  const handleCustomChange = (field: "descriptions", value: string[]) => {
    dispatch(changeCustom({ field, value }));
  };

  const handleShowBulletPoints = (value: boolean) => {
    dispatch(changeShowBulletPoints({ field: form, value }));
  };

  return (
    <Form form={form}>
      <div className="col-span-full grid grid-cols-6 gap-y-4 gap-x-4">
        <BulletListTextarea
          label="Custom Textbox"
          labelClassName="col-span-full"
          name="descriptions"
          placeholder="Bullet points"
          value={descriptions}
          onChange={handleCustomChange}
          showBulletPoints={showBulletPoints}
          onBulletToggle={handleShowBulletPoints}
        />
      </div>
    </Form>
  );
};
