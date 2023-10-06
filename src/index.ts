import { NextFunction, Request, Response } from "express";
import Validator, {
  ValidationSchema as FVSchema,
  ValidatorConstructorOptions,
} from "fastest-validator";

export type DefaultSchema = { [key: string]: string | object | [] };

export interface ValidatorOptions extends ValidatorConstructorOptions {}

export type ValidationSchema<T extends DefaultSchema = DefaultSchema> =
  FVSchema<T>;

export type MultiValidationSchema = {
  body?: ValidationSchema;
  params?: ValidationSchema;
  query?: ValidationSchema;
  headers?: ValidationSchema;
};

export type ValidateReqType =
  | "body"
  | "params"
  | "query"
  | "headers"
  | "multiple";

export type SchemaType = ValidationSchema | MultiValidationSchema;

const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

const isMultiValidationSchema = (
  schema: SchemaType
): schema is MultiValidationSchema => {
  return (
    typeof schema === "object" &&
    ("body" in schema ||
      "params" in schema ||
      "query" in schema ||
      "headers" in schema)
  );
};

export const getValidator = (validatorOptions: ValidatorOptions = {}) =>
  new Validator({
    useNewCustomCheckerFunction: true,
    ...validatorOptions,
  });

export const validateRequest = (
  schema: SchemaType,
  requestType: ValidateReqType = "body",
  validatorOptions: ValidatorOptions = {}
) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const validator = getValidator(validatorOptions);

    const validTypes: ValidateReqType[] = [
      "body",
      "params",
      "query",
      "headers",
    ];

    const err = {
      type: "Validation Error!",
      status: "error",
      message: "Invalid request type!",
    };

    if (requestType === "multiple" && isMultiValidationSchema(schema)) {
      for (const key of Object.keys(schema) as ValidateReqType[]) {
        if (key === "multiple") continue;
        if (!validTypes.includes(key)) return res.status(422).json(err);

        const validate = await validator.validate(req[key], schema[key]!);
        if (validate !== true)
          return res.status(422).json({
            ...err,
            message: validate[0].message,
            details: validate,
          });
      }
    } else {
      if (requestType !== "multiple" && !validTypes.includes(requestType))
        return res.status(422).json(err);

      const reqType = requestType !== "multiple" ? requestType : "body";
      const validate = await validator.validate(req[reqType], schema);

      if (validate !== true)
        return res
          .status(422)
          .json({ ...err, message: validate[0].message, details: validate });
    }

    next();
  });
};

export const validateMultiRequest = (
  schema: SchemaType,
  validatorOptions: ValidatorOptions = {}
) => validateRequest(schema, "multiple", validatorOptions);
