import { ExpanderWithHeightTransition } from "components/ExpanderWithHeightTransition";
import {
  DeleteIconButton,
  MoveIconButton,
  ShowIconButton,
} from "components/ResumeForm/Form/IconButton";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import {
  changeFormHeading,
  changeFormOrder,
  changeShowForm,
  selectHeadingByForm,
  selectIsFirstForm,
  selectIsLastForm,
  selectShowByForm,
  ShowForm,
} from "lib/redux/settingsSlice";
import {
  BuildingOfficeIcon,
  AcademicCapIcon,
  LightBulbIcon,
  WrenchIcon,
  PlusSmallIcon,
} from "@heroicons/react/24/outline";
import {
  addSectionInForm,
  deleteSectionInFormByIdx,
  moveSectionInForm,
} from "lib/redux/resumeSlice";

/**
 * BaseForm is the bare bone form, i.e. just the outline with no title and no control buttons.
 * ProfileForm uses this to compose its outline.
 */
export const BaseForm = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <section
    className={`flex flex-col gap-4 rounded-3xl p-6 pt-4 transition-opacity duration-200 ${className}`}
    style={{
      background: 'rgba(255, 255, 255, 0.07)',
      backdropFilter: 'blur(32px)',
      WebkitBackdropFilter: 'blur(32px)',
      border: '1px solid rgba(255, 255, 255, 0.13)',
      boxShadow: '0 8px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
    }}
  >
    {children}
  </section>
);

const FORM_TO_ICON: { [section in ShowForm]: typeof BuildingOfficeIcon } = {
  workExperiences: BuildingOfficeIcon,
  educations: AcademicCapIcon,
  projects: LightBulbIcon,
  skills: WrenchIcon,
  custom: WrenchIcon,
};

export const Form = ({
  form,
  addButtonText,
  children,
}: {
  form: ShowForm;
  addButtonText?: string;
  children: React.ReactNode;
}) => {
  const showForm = useAppSelector(selectShowByForm(form));
  const heading = useAppSelector(selectHeadingByForm(form));

  const dispatch = useAppDispatch();
  const setShowForm = (showForm: boolean) => {
    dispatch(changeShowForm({ field: form, value: showForm }));
  };
  const setHeading = (heading: string) => {
    dispatch(changeFormHeading({ field: form, value: heading }));
  };

  const isFirstForm = useAppSelector(selectIsFirstForm(form));
  const isLastForm = useAppSelector(selectIsLastForm(form));

  const handleMoveClick = (type: "up" | "down") => {
    dispatch(changeFormOrder({ form, type }));
  };

  const Icon = FORM_TO_ICON[form];

  return (
    <BaseForm
      className={`transition-opacity duration-200 ${
        showForm ? "pb-6" : "pb-2 opacity-60"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex grow items-center gap-2">
          <Icon className="h-6 w-6 text-emerald-400" aria-hidden="true" />
          <input
            type="text"
            className="block w-full border-b border-transparent text-lg font-semibold tracking-wide text-white bg-transparent outline-none hover:border-white/20 focus:border-emerald-400 transition-all"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-0.5">
          {!isFirstForm && (
            <MoveIconButton type="up" onClick={handleMoveClick} />
          )}
          {!isLastForm && (
            <MoveIconButton type="down" onClick={handleMoveClick} />
          )}
          <ShowIconButton show={showForm} setShow={setShowForm} />
        </div>
      </div>
      <ExpanderWithHeightTransition expanded={showForm}>
        {children}
      </ExpanderWithHeightTransition>
      {showForm && addButtonText && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => {
              dispatch(addSectionInForm({ form }));
            }}
            className="flex items-center rounded-xl py-2 pl-3 pr-4 text-sm font-semibold text-white/95 shadow-md transition-all hover:bg-white/10 hover:border-white/20 active:scale-95"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
            }}
          >
            <PlusSmallIcon
              className="-ml-0.5 mr-1.5 h-5 w-5 text-emerald-400"
              aria-hidden="true"
            />
            {addButtonText}
          </button>
        </div>
      )}
    </BaseForm>
  );
};

export const FormSection = ({
  form,
  idx,
  showMoveUp,
  showMoveDown,
  showDelete,
  deleteButtonTooltipText,
  children,
}: {
  form: ShowForm;
  idx: number;
  showMoveUp: boolean;
  showMoveDown: boolean;
  showDelete: boolean;
  deleteButtonTooltipText: string;
  children: React.ReactNode;
}) => {
  const dispatch = useAppDispatch();
  const handleDeleteClick = () => {
    dispatch(deleteSectionInFormByIdx({ form, idx }));
  };
  const handleMoveClick = (direction: "up" | "down") => {
    dispatch(moveSectionInForm({ form, direction, idx }));
  };

  return (
    <>
      {idx !== 0 && (
        <div className="mb-4 mt-6 border-t-2 border-dotted border-white/10" />
      )}
      <div className="relative grid grid-cols-6 gap-y-4 gap-x-4">
        <div className="col-span-full flex items-center justify-between pb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
            {form === "workExperiences"
              ? `Job #${idx + 1}`
              : form === "educations"
              ? `Education #${idx + 1}`
              : form === "projects"
              ? `Project #${idx + 1}`
              : `Item #${idx + 1}`}
          </span>
          <div className="flex items-center gap-2">
            {showMoveUp && (
              <MoveIconButton
                type="up"
                size="small"
                onClick={() => handleMoveClick("up")}
              />
            )}
            {showMoveDown && (
              <MoveIconButton
                type="down"
                size="small"
                onClick={() => handleMoveClick("down")}
              />
            )}
            {showDelete && (
              <DeleteIconButton
                onClick={handleDeleteClick}
                tooltipText={deleteButtonTooltipText}
              />
            )}
          </div>
        </div>
        {children}
      </div>
    </>
  );
};
