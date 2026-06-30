import { BaseForm } from "components/ResumeForm/Form";
import { Input, Textarea } from "components/ResumeForm/Form/InputGroup";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { changeProfile, selectProfile } from "lib/redux/resumeSlice";
import { ResumeProfile } from "lib/redux/types";

export const ProfileForm = () => {
  const profile = useAppSelector(selectProfile);
  const dispatch = useAppDispatch();
  const { name, email, phone, url, summary, location } = profile;

  const handleProfileChange = (field: keyof ResumeProfile, value: string) => {
    dispatch(changeProfile({ field, value }));
  };

  return (
    <BaseForm>
      <div className="grid grid-cols-6 gap-y-4 gap-x-4">
        <Input
          label="Name"
          labelClassName="col-span-3"
          name="name"
          placeholder="Bimal Jayakumar"
          value={name}
          onChange={handleProfileChange}
        />
        <Input
          label="Location"
          labelClassName="col-span-3"
          name="location"
          placeholder="Kochi, Kerala"
          value={location}
          onChange={handleProfileChange}
        />
        <Input
          label="Email"
          labelClassName="col-span-2"
          name="email"
          placeholder="bimal@gmail.com"
          value={email}
          onChange={handleProfileChange}
        />
        <Input
          label="Phone"
          labelClassName="col-span-2"
          name="phone"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={handleProfileChange}
        />
        <Input
          label="Website"
          labelClassName="col-span-2"
          name="url"
          placeholder="linkedin.com/in/bimaljayakumar"
          value={url}
          onChange={handleProfileChange}
        />
        <Textarea
          label="Objective"
          labelClassName="col-span-full"
          name="summary"
          placeholder="Aspiring Software Engineer passionate about web development and building AI-driven solutions."
          value={summary}
          onChange={handleProfileChange}
        />
      </div>
    </BaseForm>
  );
};
